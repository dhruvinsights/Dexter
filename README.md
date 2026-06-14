# Dexter: Orbital Sustainability Platform

**A real-time map of everything humanity has left in orbit, and a physics engine that projects where it is heading.**

Dexter renders the genuine catalogue of objects circling Earth — live, with real orbital mechanics — and pairs it with a scientific debris-evolution model so anyone, from a curious student to a mission planner, can see the state of near-Earth space and understand the choices that keep it usable.

![Low Earth Orbit debris field — NASA Orbital Debris Program Office](https://commons.wikimedia.org/wiki/Special:FilePath/Debris-LEO1280.jpg)

## 🎥 Demo Video

[![Dexter Demo]("https://github.com/user-attachments/assets/deebb53e-4c0d-4a4a-a98b-134066260c79)](https://www.youtube.com/watch?v=fS5bWz9dX-U)

**Watch Complete Video Tutorial:** https://www.youtube.com/watch?v=fS5bWz9dX-U
> *Every white dot is a tracked object in low Earth orbit. This is a NASA Orbital Debris Program Office visualisation — not artistic licence. Dexter renders this same population from live data.*

---

## Table of Contents

1. [For newcomers: what is space debris?](#for-newcomers-what-is-space-debris)
2. [Why this matters](#why-this-matters)
3. [What Dexter does](#what-dexter-does)
4. [What is real vs. modelled](#what-is-real-vs-modelled)
5. [The science inside](#the-science-inside)
6. [Architecture](#architecture)
7. [Technology stack](#technology-stack)
8. [Getting started](#getting-started)
9. [Data pipeline and update cadence](#data-pipeline-and-update-cadence)
10. [Configuration](#configuration)
11. [Scalability and the path to operational use](#scalability-and-the-path-to-operational-use)
12. [Market and impact](#market-and-impact)
13. [Glossary](#glossary)
14. [References](#references)
15. [Project structure](#project-structure)
16. [Roadmap](#roadmap)

---

## For newcomers: what is space debris?

If you have never thought about this before, start here. No background required.

Since 1957, humans have launched thousands of rockets and satellites. Most of what went up is still up there. When a satellite stops working, it does not fall straight down — it keeps circling Earth for years, decades, or centuries. When two objects collide, or when an old rocket's leftover fuel explodes, they shatter into thousands of fast-moving fragments. Those fragments are **space debris** (also called *orbital debris* or *space junk*).

A few plain-language terms used throughout Dexter:

- **Orbit** — the path an object follows as it circles Earth. Lower orbits are faster; higher orbits are slower.
- **LEO (Low Earth Orbit)** — roughly 200–2,000 km up. This is where most satellites, the International Space Station, and the worst debris congestion live.
- **Altitude shell** — a band of orbits at a similar height (for example "700–800 km"). Dexter groups objects into shells to study them.
- **Payload** — a working or retired satellite (something launched to do a job).
- **Rocket body** — the spent upper stage of a rocket, left in orbit after delivering its payload.
- **Debris / fragment** — a piece of a broken-up object. Even a 1 cm fragment travels at ~7–8 km/s — faster than a rifle bullet — and can destroy a working satellite.
- **Conjunction** — a close approach between two objects; a near-miss that operators must watch.
- **Decay / re-entry** — when an object's orbit sinks low enough that the thin upper atmosphere drags it down to burn up. The atmosphere is nature's only free cleaning service, and it only works at low altitudes.
- **Kessler Syndrome** — the nightmare scenario (Donald Kessler, NASA, 1978): so much debris accumulates that collisions create more debris, which causes more collisions, in a chain reaction. Some orbital shells could become unusable for generations.

![Debris ring around the geostationary belt — NASA ODPO](https://commons.wikimedia.org/wiki/Special:FilePath/Debris-GEO1280.jpg)

> *Higher up, at ~36,000 km, sits the geostationary ring where weather and communications satellites live. Debris there does not decay for millions of years.*

---

## Why this matters

- **More than 130 million** fragments larger than 1 mm are estimated to be in orbit; roughly **36,500** are larger than 10 cm and individually tracked ([ESA, *Space debris by the numbers*](https://www.esa.int/Space_Safety/Space_Debris/Space_debris_by_the_numbers)).
- A single collision can be catastrophic: in 2009 the defunct **Cosmos 2251** struck the active **Iridium 33**, producing over 2,000 trackable fragments that still threaten other spacecraft today ([NASA ODPO Orbital Debris Quarterly News](https://orbitaldebris.jsc.nasa.gov/quarterly-news/)).
- Anti-satellite weapon tests have made it worse: China's **Fengyun-1C** test (2007) created ~3,500 tracked fragments — the single largest debris-generating event on record — and Russia's **Cosmos 1408** test (2021) forced the ISS crew to shelter ([NASA Orbital Debris Program Office](https://orbitaldebris.jsc.nasa.gov/)).
- The economy now depends on space: GPS timing underpins financial markets and power grids; Earth-observation satellites drive agriculture, climate science, and disaster response. The orbital environment is shared infrastructure with no owner — a textbook tragedy of the commons.

The 700–900 km band — visible as the densest belt in Dexter's Shell Analysis — is the region scientists most worry about, because it is high enough that atmospheric drag barely cleans it, yet crowded enough that collisions are likely. This is precisely the regime [Kessler and Cour-Palais (1978)](https://doi.org/10.1029/JA083iA06p02637) identified as prone to a self-sustaining collision cascade.

---

## What Dexter does

### Live Sky
Renders the real tracked catalogue propagated with genuine orbital mechanics (SGP4). Each object sits at its physically computed position, updated as time advances. Click any object to fly the camera to it, see a 3D model, and trace its true orbit as a red ring. Colour-code the whole field by object type (payload / rocket body / debris) or by owning nation.

### Shell Analysis
The current state of low Earth orbit, binned by altitude from the real catalogue. For each shell it shows the live object and debris counts, the atmospheric-drag clearing time, and a **Kessler stability indicator** — a physically computed flag for whether a shell produces collision fragments faster than drag can remove them. Shells in that regime are marked *Critical*: debris there accumulates indefinitely.

### Physics Engine
A real orbital-debris **source–sink model** projects the population forward in time, built directly on the peer-reviewed physics of orbital collisions and atmospheric decay and seeded from Dexter's real current data. See [The science inside](#the-science-inside).

### Scenario and Forecasting
Compare intervention strategies — Active Debris Removal, launch-rate caps, improved post-mission disposal, AI traffic management, or a hybrid — and watch 30-year outcomes diverge: object growth, cumulative collisions, cost, and a sustainability grade. Every number flows from the physics engine, seeded from reality.

### Time Machine
Sweep through launch history from 1957 to today and watch the orbital population grow object by object, by real launch year.

### Create Satellite
Design a satellite by basic parameters, full orbital elements, or by pasting a real two-line element set (TLE). Dexter generates a valid, checksummed TLE and propagates it live alongside the real catalogue.

### AI Agent (optional)
A retrieval-augmented analysis layer that produces risk assessments, sustainability analysis, and executive summaries grounded in your own uploaded documents. Runs against local Ollama or a hosted provider — entirely optional, and clearly marked offline until you configure it.

---

## What is real vs. modelled

Dexter is deliberately transparent about provenance. Nothing fabricated is presented as measured truth.

| Feature | Source | Status |
|---|---|---|
| Live Sky objects and positions | CelesTrak GP catalogue + SGP4 propagation | **Real data, real physics** |
| Object types and owning nations | CelesTrak SATCAT | **Real data** |
| Shell Analysis (current debris by altitude) | SATCAT apogee/perigee binned into shells | **Real current state** |
| Scenario / Forecasting projections | Source–sink debris model, seeded from the real catalogue | **Physics model** — a deterministic projection, not telemetry |
| Kessler stability indicator | Collision rate vs. drag-decay rate from real seed | **Physics model** |
| AI Agent responses | Local/hosted LLM you configure | Depends on your provider; offline until set up |

A projection is not a measurement, and Dexter says so directly in the relevant panels. Every long-term debris study in the published literature is a *model*; its value lies in the rigour of the physics, not in a false claim of certainty. Dexter follows that same principle.

---

## The science inside

### How the model works, in plain language

Picture low Earth orbit as a stack of shelves, each shelf a band of altitude. On every shelf sit three kinds of things: working satellites, dead rocket parts, and broken fragments (debris). Each year the model asks one simple question for each shelf — *what gets added, and what gets removed?*

Things are **added** when a new satellite is launched onto a shelf, when a satellite dies and is not cleaned up (becoming junk), or when two objects crash and shatter into hundreds of new fragments.

Things are **removed** when air drag pulls a low object down until it burns up in the atmosphere (this only works on the bottom shelves — higher up the air is far too thin), when a satellite steers itself down at the end of its life, or when a cleanup mission removes debris.

The chance of a crash on a shelf rises sharply with how crowded it is: roughly, double the objects and you quadruple the collision risk, because any object can hit any other. That is the core danger — once a shelf is crowded enough, crashes make fragments, fragments cause more crashes, and the shelf can spiral out of control. That runaway is the **Kessler Syndrome** ([Kessler & Cour-Palais, 1978](https://doi.org/10.1029/JA083iA06p02637)), and Dexter's Shell Analysis flags exactly which shelves are heading that way today.

Dexter starts each shelf with the *real* number of objects counted from today's catalogue, then plays the years forward using these rules. The result is not a guess pulled from thin air — it is arithmetic on real starting conditions, using the physical laws scientists have published since the 1970s.

The technical detail follows.

### Orbital propagation — SGP4
Live Sky positions come from **SGP4**, the Simplified General Perturbations model defined in [*Spacetrack Report No. 3* (Hoots & Roehrich, 1980)](https://celestrak.org/NORAD/documentation/spacetrk.pdf) and maintained for the public Two-Line Element catalogue by the United States Space Force 18th Space Defense Squadron via [Space-Track.org](https://www.space-track.org/) and [CelesTrak](https://celestrak.org/). SGP4 accounts for Earth's oblateness (J2), atmospheric drag, and lunar/solar perturbations to the accuracy the public catalogue supports. It runs in a Web Worker so 15,000+ objects propagate without blocking the interface (`src/sim/liveSky.worker.ts`).

### Debris evolution — a source–sink model
The engine (`src/sim/debrisEngine.ts`) discretises LEO into altitude shells and advances each shell's payload / debris / rocket-body counts year by year under explicit physical terms:

**Sources** (what adds objects)
- **Launches** — new payloads, distributed across shells by real launch demand.
- **Post-mission derelicts** — satellites that reach end of life and fail to de-orbit (governed by a PMD-compliance fraction).
- **Collision fragments** — modelled with a trackable-fragment yield per catastrophic collision, following the approach of the [NASA Standard Breakup Model](https://orbitaldebris.jsc.nasa.gov/modeling/) (Johnson et al., 2001).

**Sinks** (what removes objects)
- **Atmospheric drag decay** — altitude-dependent; objects sink to lower shells and eventually re-enter. This is the dominant natural cleaner below ~600 km and negligible above ~900 km.
- **Post-mission disposal (PMD)** — compliant satellites de-orbit themselves.
- **Active Debris Removal (ADR)** — modelled removal of debris from targeted shells.

**Collision frequency** uses the particle-in-a-box kinetic rate — the standard first-order approximation for a well-mixed shell, introduced for orbital debris by [Kessler & Cour-Palais (1978)](https://doi.org/10.1029/JA083iA06p02637) and developed analytically by Talent (1992), *Analytic Model for Orbital Debris Environmental Management*, Journal of Spacecraft and Rockets:

```
λ_ij = ⟨σ · v_rel⟩ · N_i · N_j / V_shell
```

where `⟨σ·v_rel⟩` is the collision cross-section times relative velocity (~10 km/s in LEO), `N_i, N_j` are population counts, and `V_shell` is the shell volume. Maneuverable active payloads receive a collision-avoidance discount. The intervention strategies (active debris removal, post-mission disposal compliance) mirror the parametric remediation studies published by NASA's Orbital Debris Program Office — Liou (2011), *An active debris removal parametric study for LEO environment remediation*, Advances in Space Research 47(11) — searchable via the [NASA Technical Reports Server](https://ntrs.nasa.gov/).

### Kessler stability indicator
For each shell, Dexter compares the collisional fragment-production rate to the drag-removal rate. A ratio above 1 means the shell generates trackable debris faster than the atmosphere clears it — the physical signature of an incipient Kessler cascade. With real 2026 data this correctly flags the 700–1500 km bands as critical, matching the published consensus.

### Real initial conditions
The model is seeded from `public/shells.json`, built by `scripts/build-shells.ts` from the CelesTrak SATCAT: every on-orbit object (decayed objects excluded) is binned by mean altitude and tallied by type. The result reproduces the real debris belt — a pronounced peak at 700–900 km from historical break-up events.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend — React + React Three Fiber (Three.js)            │
│                                                              │
│  • Live Sky        SGP4 propagation in a Web Worker          │
│  • Physics engine  source–sink debris model (TypeScript)     │
│  • Shell Analysis  real debris-by-altitude + Kessler flag    │
│  • Scenario/Forecast, Time Machine, Create Satellite         │
│  • State: Zustand   Styling: Tailwind                        │
└───────────────┬──────────────────────────────────────────────┘
                │ optional HTTP / SSE
┌───────────────▼──────────────────────────────────────────────┐
│  Backend — FastAPI (optional AI/RAG layer)                   │
│  • /api/ai/analyze, /stream, /health, /configure             │
│  • Retrieval-augmented generation over uploaded documents    │
│  • Pluggable LLM: Ollama (local) / OpenAI / Gemini           │
│  • Pluggable vector store: Qdrant / pgvector / Db2 / …        │
└──────────────────────────────────────────────────────────────┘

Data sources (fetched to /public, refreshed ≤ every 2 hours):
  CelesTrak GP/TLE  → live catalogue + SGP4
  CelesTrak SATCAT  → owners, object types, apogee/perigee → physics seed
```

The frontend is fully functional on its own. The backend is an optional intelligence layer; when it is offline, the application states so plainly rather than inventing data.

---

## Technology stack

| Layer | Technology |
|---|---|
| UI / 3D | React, TypeScript, Vite, React Three Fiber, Three.js, Tailwind |
| State | Zustand |
| Orbital mechanics | SGP4 propagation, Web Workers |
| Physics model | TypeScript source–sink engine (`src/sim/debrisEngine.ts`) |
| Backend (optional) | FastAPI, Python, Server-Sent Events |
| AI providers | Ollama, OpenAI, Google Gemini, OpenAI-compatible endpoints |
| Vector stores | Qdrant, pgvector, Milvus, Weaviate, Chroma, IBM Db2 |
| Data | CelesTrak GP/TLE, CelesTrak SATCAT |

---

## Getting started

### Prerequisites
- Node.js 18 or newer
- Internet access for the initial data fetch
- (Optional) Python 3.10+ and Ollama for the AI layer

### Frontend (everything real works here)

```bash
npm install

# Fetch real data (writes to /public; respects CelesTrak's 2-hour cadence)
npm run fetch-tle       # live catalogue: CelesTrak GP/TLE
npm run fetch-satcat    # object metadata: owners, types
npm run build-shells    # build the real per-altitude physics seed from SATCAT

npm run dev             # http://localhost:5173
```

### Backend (optional AI layer)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
# Interactive API docs: http://localhost:8000/docs
```

Then open Settings in the app, choose a provider (Ollama / OpenAI / Gemini), and save. The AI panels light up once a provider responds; until then they honestly report "offline".

---

## Data pipeline and update cadence

CelesTrak republishes the United States Space Force 18th Space Defense Squadron catalogue and updates it at most every two hours. Dexter honours this:

- `npm run fetch-tle` downloads the live catalogue to `public/tle/TLE.txt` and **refuses to re-download if the file is younger than 2 hours**, so you can never trip CelesTrak's rate limits.
- The application only ever reads that local file — it does not call CelesTrak from the browser.
- `npm run fetch-satcat` and `npm run build-shells` refresh object metadata and the physics seed.

For always-fresh data, schedule the fetch on a timer, for example every two hours:

```cron
0 */2 * * *  cd /path/to/Dexter && npm run fetch-tle && npm run fetch-satcat && npm run build-shells
```

---

## Configuration

### AI provider (optional)
Configure in-app via Settings, or in `backend/.env`:

```ini
AI_PROVIDER=ollama            # ollama | openai | gemini | custom
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
# OPENAI_API_KEY=...
# GEMINI_API_KEY=...
```

### Vector database (optional, for RAG)
Driver-agnostic. Choose a driver and connection in Settings; the backend selects the implementation server-side. Supported: Qdrant, pgvector, Milvus, Weaviate, Chroma, IBM Db2.

---

## Scalability and the path to operational use

Dexter is a research and education platform today. The architecture is built to scale toward operational space-situational-awareness (SSA) standards:

- **Higher-fidelity data.** Swap the public TLE catalogue for the authoritative Space-Track.org feed or a commercial SSA provider (LeoLabs, Slingshot) with no change to the rendering or physics interfaces.
- **Conjunction screening.** The same propagation pipeline can compute pairwise close approaches and produce Conjunction Data Messages (CDM), the operational currency of NASA's Conjunction Assessment Risk Analysis (CARA) and the U.S. Space Force's collision-warning service.
- **Validated physics.** The source–sink engine can be calibrated against the published long-term evolutionary studies of NASA's Orbital Debris Program Office and ESA's Space Debris Office, and against the published NASA Standard Breakup Model, to move from indicative to decision-grade projections.
- **GPU-scale rendering.** The Three.js point-cloud renderer already handles the full tracked catalogue at interactive frame rates and extends to the projected 100,000+ object catalogues of the next decade.
- **Compute back end.** The browser engine can be promoted to a server-side or WebAssembly Monte-Carlo ensemble for uncertainty quantification, matching how long-term debris models are run for policy studies.

The goal: a tool that a student can open in a browser and a mission planner can trust in a control room, sharing one honest data model.

---

## Market and impact

- **Space agencies and SSA providers.** NASA's Orbital Debris Program Office, ESA's Space Debris Office, and commercial trackers all need accessible visualisation and scenario tooling for analysis and public communication.
- **Satellite operators.** Constellation operators (Starlink, OneWeb, Kuiper) must demonstrate sustainability and plan disposal; Dexter's scenario engine quantifies the trade-offs.
- **Regulators and policy.** The FCC's 5-year de-orbit rule (2024), the IADC mitigation guidelines, and UN COPUOS discussions all hinge on the kind of long-term projections Dexter makes tangible.
- **Insurers and investors.** Orbital congestion is a financial risk to a fast-growing space economy; sustainability grades inform underwriting and due diligence.
- **Education and the public.** Most people have never seen the scale of the problem. Dexter turns an abstract threat into something you can rotate in your hand.

Space sustainability is moving from a niche concern to a licensing requirement and an economic necessity. Dexter sits exactly at that intersection — credible enough for experts, clear enough for everyone else.

---

## Glossary

| Term | Meaning |
|---|---|
| TLE | Two-Line Element set — the standard format encoding an object's orbit |
| SGP4 | Simplified General Perturbations model — the math that turns a TLE into a position |
| SATCAT | Satellite Catalog — the master registry of tracked objects and their attributes |
| LEO / MEO / GEO | Low / Medium / Geostationary Earth Orbit |
| Apogee / Perigee | The highest / lowest point of an orbit |
| ADR | Active Debris Removal — missions that capture and de-orbit debris |
| PMD | Post-Mission Disposal — a satellite de-orbiting itself after its mission |
| Conjunction | A close approach between two orbiting objects |
| Kessler Syndrome | Self-sustaining collision cascade that can render orbits unusable |
| Source–sink model | A model that tracks population by balancing what adds vs. removes objects |

---

## References

Every physical assumption in Dexter traces to a published, citable source.

**Peer-reviewed research**
- Kessler, D. J., & Cour-Palais, B. G. (1978). *Collision Frequency of Artificial Satellites: The Creation of a Debris Belt.* Journal of Geophysical Research, 83(A6), 2637–2646. https://doi.org/10.1029/JA083iA06p02637 — the foundational Kessler Syndrome paper and the origin of the particle-in-a-box collision rate.
- Talent, D. L. (1992). *Analytic Model for Orbital Debris Environmental Management.* Journal of Spacecraft and Rockets, 29(4), 508–513. — the analytic source–sink / particle-in-a-box treatment.
- Johnson, N. L., Krisko, P. H., Liou, J.-C., & Anz-Meador, P. D. (2001). *NASA's New Breakup Model of EVOLVE 4.0.* Advances in Space Research, 28(9), 1377–1384. — the NASA Standard Breakup Model behind the collision-fragment yield.
- Liou, J.-C. (2011). *An active debris removal parametric study for LEO environment remediation.* Advances in Space Research, 47(11), 1865–1876. — the basis for the ADR and remediation scenarios. Searchable at https://ntrs.nasa.gov/
- Kessler, D. J., Johnson, N. L., Liou, J.-C., & Matney, M. (2010). *The Kessler Syndrome: Implications to Future Space Operations.* Advances in the Astronautical Sciences, 137. — a modern restatement of the cascade risk.

**Authoritative data and standards**
- NASA Orbital Debris Program Office (ODPO): https://orbitaldebris.jsc.nasa.gov/ — modeling resources and the *Orbital Debris Quarterly News*.
- NASA Technical Reports Server (NTRS): https://ntrs.nasa.gov/ — open access to the NASA debris-modeling literature.
- ESA Space Debris Office: https://www.esa.int/Space_Safety/Space_Debris — the annual *Space Environment Report* and population statistics.
- Inter-Agency Space Debris Coordination Committee (IADC) — *Space Debris Mitigation Guidelines* (IADC-02-01): https://www.iadc-home.org/
- Hoots, F. R., & Roehrich, R. L. (1980). *Spacetrack Report No. 3: Models for Propagation of NORAD Element Sets.* https://celestrak.org/NORAD/documentation/spacetrk.pdf — the definitive SGP4 specification.
- CelesTrak (Dr. T. S. Kelso): https://celestrak.org/ — the public GP/TLE catalogue and SATCAT used as Dexter's live data source.
- United States Space Force, 18th Space Defense Squadron — Space-Track.org: https://www.space-track.org/ — the authoritative tracking catalogue.

*Imagery: NASA Orbital Debris Program Office, public domain, via Wikimedia Commons.*

---

## Project structure

```
Dexter/
├── src/
│   ├── viz/                 3D scene, Earth, Live Sky field, orbits, camera
│   ├── sim/
│   │   ├── liveSky.worker.ts   SGP4 propagation (Web Worker)
│   │   ├── debrisEngine.ts     source–sink debris evolution engine
│   │   ├── shellDefs.ts        altitude shells, drag-lifetime model
│   │   └── loadPhysics.ts      seed loader + scenario runner
│   ├── features/            UI panels (live, forecast, shells, ai, settings, …)
│   ├── state/               Zustand stores
│   ├── lib/                 SATCAT, owners, orbital helpers
│   └── integration/         backend client + data contracts
├── scripts/
│   ├── fetch-celestrak.ts   live catalogue (≤ every 2h)
│   ├── fetch-satcat.ts      object metadata
│   └── build-shells.ts      real physics seed from SATCAT
├── backend/                 optional FastAPI AI/RAG service
└── public/
    ├── tle/TLE.txt          live catalogue
    ├── satcat.json          owner + type per object
    └── shells.json          real per-altitude physics seed
```

---

## Roadmap

- Render debris and rocket bodies in Live Sky (currently the active catalogue), with type filters.
- Time Machine debris-belt growth: animate the debris population expanding decade by decade.
- Pairwise conjunction screening and CDM-style close-approach alerts.
- Monte-Carlo ensembles for projection uncertainty bands.
- Authoritative-data mode (Space-Track / commercial SSA feeds).
- Physics calibration against published NASA and ESA long-term debris-evolution reference studies.

---

**Dexter** — see what is up there, understand where it is going, and explore what keeps orbit usable for the next century.
