"""
RAG knowledge-base bootstrap.

Creates the POLICY_DOCUMENTS table (in the connection's CURRENT SCHEMA — DEXTER
by default) if it does not exist, and seeds it with real space-debris-mitigation
policy documents the first time it is empty. Called at API startup so the
knowledge base is provisioned "in real time" without a manual migration step.

The retrieval path (AIDataService.get_policy_documents) does keyword LIKE search
over title + content, so these documents become live RAG context for the analyst
and chat endpoints.
"""
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

TABLE = "POLICY_DOCUMENTS"

# CLOB content so large uploaded documents also fit; the seed docs themselves are
# modest. PRIMARY KEY on doc_id makes seeding idempotent via a NOT EXISTS guard.
CREATE_DDL = f"""
CREATE TABLE {TABLE} (
    doc_id     VARCHAR(64) NOT NULL PRIMARY KEY,
    title      VARCHAR(512),
    source     VARCHAR(512),
    content    CLOB(1048576),
    created_at TIMESTAMP
)
"""

# Real, citable space-sustainability policy documents (concise faithful summaries).
SEED_DOCUMENTS: list[dict] = [
    {
        "doc_id": "iadc-02-01",
        "title": "IADC Space Debris Mitigation Guidelines (IADC-02-01)",
        "source": "Inter-Agency Space Debris Coordination Committee, Rev. 2021",
        "content": (
            "The IADC Space Debris Mitigation Guidelines are the foundational technical "
            "consensus of the world's major space agencies (NASA, ESA, JAXA, Roscosmos, "
            "CNSA, ISRO and others). They define two protected regions: Region A, Low Earth "
            "Orbit (LEO), the spherical shell from the Earth's surface up to 2,000 km "
            "altitude; and Region B, the Geosynchronous (GEO) region, a band 35,586-35,986 km "
            "in altitude and +/-15 degrees latitude. The guidelines set out four objectives: "
            "(1) limit debris released during normal operations; (2) minimise the potential "
            "for on-orbit break-ups, including passivation of all stored energy sources "
            "(propellant, batteries, pressurant) at end of mission; (3) carry out post-mission "
            "disposal; and (4) prevent on-orbit collisions. For LEO, post-mission disposal "
            "requires removing the spacecraft from orbit within 25 years of mission completion "
            "(the '25-year rule'). For GEO, spacecraft should be re-orbited to a disposal orbit "
            "at least 235 km + (1000 * Cr * A/m) above GEO. Intentional destruction creating "
            "long-lived debris is to be avoided."
        ),
    },
    {
        "doc_id": "un-copuos-2007",
        "title": "UN COPUOS Space Debris Mitigation Guidelines (2007)",
        "source": "UN Committee on the Peaceful Uses of Outer Space; endorsed by UN GA Res 62/217",
        "content": (
            "Adopted by the UN Committee on the Peaceful Uses of Outer Space and endorsed by "
            "the General Assembly, these seven voluntary guidelines are the internationally "
            "recognised baseline for debris mitigation: (1) Limit debris released during normal "
            "operations. (2) Minimise the potential for break-ups during operational phases. "
            "(3) Limit the probability of accidental collision in orbit. (4) Avoid intentional "
            "destruction and other harmful activities. (5) Minimise potential for post-mission "
            "break-ups resulting from stored energy, via passivation. (6) Limit the long-term "
            "presence of spacecraft and launch vehicle stages in LEO after the end of their "
            "mission. (7) Limit the long-term interference of spacecraft and stages with the "
            "GEO region after the end of their mission. The guidelines are non-binding but have "
            "been transposed into national regulation and the ISO 24113 standard."
        ),
    },
    {
        "doc_id": "nasa-odmsp-2019",
        "title": "NASA Orbital Debris Mitigation Standard Practices (ODMSP)",
        "source": "U.S. Government Orbital Debris Mitigation Standard Practices, 2019 update",
        "content": (
            "The U.S. Government ODMSP, updated in 2019, govern all U.S. government spacecraft "
            "and launch operations. Four objectives: control debris released during normal "
            "operations; minimise debris from accidental explosions (deplete or safe all "
            "on-board stored energy); select safe flight profiles and operational configurations "
            "to limit accidental collisions; and conduct post-mission disposal. Disposal options "
            "for LEO are: (a) atmospheric re-entry within 25 years, with the human casualty risk "
            "from surviving debris held below 1 in 10,000; (b) manoeuvre to a storage orbit above "
            "LEO and below GEO; or (c) direct retrieval. For GEO, re-orbit to a graveyard orbit "
            "at least 235 km above the GEO arc. The 2019 update added preferred reliability "
            "thresholds for successful disposal (>90%) and addressed large constellations and "
            "rendezvous/proximity operations."
        ),
    },
    {
        "doc_id": "esa-ipol-2014",
        "title": "ESA Space Debris Mitigation Policy & ISO 24113",
        "source": "ESA/ADMIN/IPOL(2014)2; ISO 24113:2019",
        "content": (
            "ESA's space debris mitigation policy (ESA/ADMIN/IPOL(2014)2) makes compliance with "
            "ISO 24113 'Space systems - Space debris mitigation requirements' mandatory for ESA "
            "missions. ISO 24113 is the top-level international standard implementing the IADC "
            "and UN guidelines as verifiable requirements. Key thresholds: a spacecraft passing "
            "through or operating in LEO must be cleared from the protected LEO region within 25 "
            "years of end of mission; the probability of successful post-mission disposal must be "
            "at least 0.9 (90%); the casualty risk to people on the ground from an uncontrolled "
            "re-entry must not exceed 1 in 10,000; and all sources of stored energy must be "
            "passivated. ESA's Zero Debris approach (2023) goes further, targeting no new debris "
            "generation in Earth orbit by 2030 for ESA missions, tightening disposal reliability "
            "and shortening orbital lifetimes."
        ),
    },
    {
        "doc_id": "fcc-5-year-2022",
        "title": "FCC 5-Year Deorbit Rule",
        "source": "U.S. Federal Communications Commission, FCC 22-74 (2022)",
        "content": (
            "In September 2022 the U.S. FCC adopted a rule requiring that satellites ending their "
            "missions in or passing through LEO be deorbited 'as soon as practicable, and no more "
            "than five years following the end of their mission.' This sharply tightens the long-"
            "standing 25-year guideline and applies to U.S.-licensed operators and to non-U.S. "
            "operators seeking U.S. market access, with the requirement phasing in for spacecraft "
            "deployed about two years after adoption. The five-year rule is a response to the rapid "
            "growth of large LEO constellations and the rising collision risk in congested shells, "
            "and is the most aggressive post-mission disposal timeline yet adopted by a major "
            "regulator."
        ),
    },
    {
        "doc_id": "kessler-1978",
        "title": "Kessler Syndrome: Collision Cascading in LEO",
        "source": "Kessler & Cour-Palais, J. Geophysical Research, 1978",
        "content": (
            "The Kessler Syndrome describes a runaway cascade in which the density of objects in "
            "low Earth orbit becomes high enough that collisions generate fragments faster than "
            "they decay, each collision raising the probability of further collisions. Because the "
            "collision rate scales roughly with the square of object spatial density, certain LEO "
            "altitude bands - particularly the heavily populated 800-1,000 km region - are of "
            "greatest concern and may already be approaching instability. Major fragmentation "
            "events such as the 2007 Fengyun-1C anti-satellite test, the 2009 Cosmos-2251 / "
            "Iridium-33 accidental collision, and the 2021 Cosmos-1408 ASAT test each injected "
            "thousands of trackable fragments into these bands, illustrating how single events can "
            "durably worsen the long-term environment. Active debris removal (ADR) of a few large, "
            "high-collision-risk objects per year is widely modelled (e.g. in MOCAT-style "
            "simulations) as necessary to stabilise the population."
        ),
    },
]


def ensure_policy_documents(db) -> int:
    """
    Ensure the POLICY_DOCUMENTS table exists and is seeded.

    Returns the number of documents inserted this call (0 if already populated).
    Best-effort: logs and returns -1 on failure so it can never break startup.
    """
    try:
        if not db.table_exists(TABLE):
            logger.info(f"Creating RAG table {db.schema}.{TABLE} …")
            with db.get_cursor() as cursor:
                cursor.execute(CREATE_DDL)
            logger.info(f"✓ Created {db.schema}.{TABLE}")

        # Count existing rows; seed only when empty (idempotent).
        with db.get_cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) FROM {TABLE}")
            count = cursor.fetchone()[0]

        if count and count > 0:
            logger.info(f"RAG knowledge base already populated ({count} documents)")
            return 0

        logger.info(f"Seeding {len(SEED_DOCUMENTS)} policy documents into {db.schema}.{TABLE} …")
        inserted = 0
        with db.get_cursor() as cursor:
            for doc in SEED_DOCUMENTS:
                cursor.execute(
                    f"INSERT INTO {TABLE} (doc_id, title, source, content, created_at) "
                    f"VALUES (?, ?, ?, ?, ?)",
                    (doc["doc_id"], doc["title"], doc["source"], doc["content"], datetime.utcnow()),
                )
                inserted += 1
        logger.info(f"✓ Seeded {inserted} policy documents into the RAG knowledge base")
        return inserted

    except Exception as e:  # noqa: BLE001
        logger.warning(f"RAG knowledge-base bootstrap skipped: {e}")
        return -1
