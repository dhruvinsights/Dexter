# Workstream 1 — Data Layer: CelesTrak TLE Ingestion & Orbital State Builder

**Owner:** Person A  
**Estimated effort:** 6–8 hours  
**Parallel with:** All other workstreams (this is the foundation)  
**Outputs consumed by:** WS2 (MOCAT Simulation)

---

## Goal

Build a reliable pipeline that fetches real Two-Line Element (TLE) data from CelesTrak, parses it into a structured orbital object catalogue, and serializes it into the exact input format MIT MOCAT expects to start a simulation.

This workstream has no blockers — start immediately on Day 1.

---

## Background: What Are TLEs?

A TLE (Two-Line Element set) is a standardized data format from NORAD that encodes an orbital object's position and velocity parameters at a specific epoch. Example:

```
ISS (ZARYA)
1 25544U 98067A   24001.50000000  .00001234  00000-0  20000-4 0  9999
2 25544  51.6400 000.0000 0001234  90.0000 270.0000 15.50000000000000
```

CelesTrak publishes updated TLE sets every few hours at `celestrak.org`.

We use the **GP (General Perturbations) data** via their JSON API — no parsing needed.

---

## What You Need to Build

### 1.1 CelesTrak Fetcher

**File:** `backend/app/data/celestrak_fetcher.py`

Fetch the active satellite catalogue and debris catalogue from CelesTrak's REST API.

**Endpoints to use:**

```python
# Active payloads (operational satellites)
https://celestrak.org/SOCRATES/query.php?...

# Active satellites (GP format JSON - preferred)
https://celestrak.org/SATCAT/elements.php?GROUP=active&FORMAT=json

# Space debris
https://celestrak.org/SATCAT/elements.php?GROUP=debris&FORMAT=json

# All trackable objects (combined - use for full picture)
https://celestrak.org/SATCAT/elements.php?GROUP=all&FORMAT=json
```

**Implementation:**

```python
# backend/app/data/celestrak_fetcher.py

import httpx
import asyncio
from datetime import datetime, timedelta
from pathlib import Path
import json
from app.models.orbital_state import TLEObject, OrbitalCatalogue

CELESTRAK_BASE = "https://celestrak.org/SATCAT/elements.php"

# Cache TTL: TLEs update ~4x daily, so 6hr cache is appropriate
CACHE_TTL_HOURS = 6
CACHE_FILE = Path("data/cache/tle_snapshot.json")

async def fetch_group(group: str, client: httpx.AsyncClient) -> list[dict]:
    """Fetch a TLE group from CelesTrak GP JSON API."""
    url = f"{CELESTRAK_BASE}?GROUP={group}&FORMAT=json"
    response = await client.get(url, timeout=30.0)
    response.raise_for_status()
    return response.json()

async def fetch_full_catalogue() -> OrbitalCatalogue:
    """
    Fetch active payloads + debris from CelesTrak.
    Falls back to cached snapshot if request fails.
    Returns: OrbitalCatalogue with timestamp and object list.
    """
    async with httpx.AsyncClient() as client:
        # Fetch in parallel
        active, debris = await asyncio.gather(
            fetch_group("active", client),
            fetch_group("debris", client),
            return_exceptions=True
        )

    objects = []
    for raw_obj in (active or []) + (debris or []):
        try:
            objects.append(TLEObject(
                norad_id=raw_obj["NORAD_CAT_ID"],
                name=raw_obj["OBJECT_NAME"],
                object_type=raw_obj["OBJECT_TYPE"],
                epoch=raw_obj["EPOCH"],
                mean_motion=float(raw_obj["MEAN_MOTION"]),
                eccentricity=float(raw_obj["ECCENTRICITY"]),
                inclination=float(raw_obj["INCLINATION"]),
                ra_of_asc_node=float(raw_obj["RA_OF_ASC_NODE"]),
                arg_of_pericenter=float(raw_obj["ARG_OF_PERICENTER"]),
                mean_anomaly=float(raw_obj["MEAN_ANOMALY"]),
                bstar=float(raw_obj["BSTAR"]),
                altitude_km=_compute_altitude(float(raw_obj["MEAN_MOTION"])),
            ))
        except (KeyError, ValueError):
            continue  # Skip malformed entries

    catalogue = OrbitalCatalogue(
        fetched_at=datetime.utcnow().isoformat(),
        total_objects=len(objects),
        objects=objects
    )

    # Cache to disk
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    CACHE_FILE.write_text(catalogue.model_dump_json(indent=2))

    return catalogue

def _compute_altitude(mean_motion_rev_per_day: float) -> float:
    """Approximate altitude from mean motion (km)."""
    import math
    MU = 398600.4418  # Earth gravitational parameter km³/s²
    EARTH_RADIUS_KM = 6371.0
    n = mean_motion_rev_per_day * 2 * math.pi / 86400  # rad/s
    a = (MU / n**2) ** (1/3)  # semi-major axis km
    return a - EARTH_RADIUS_KM

def load_cached_catalogue() -> OrbitalCatalogue | None:
    """Load cached TLE snapshot if it's still fresh."""
    if not CACHE_FILE.exists():
        return None
    data = json.loads(CACHE_FILE.read_text())
    age = datetime.utcnow() - datetime.fromisoformat(data["fetched_at"])
    if age > timedelta(hours=CACHE_TTL_HOURS):
        return None
    return OrbitalCatalogue(**data)
```

---

### 1.2 Pydantic Data Models

**File:** `backend/app/models/orbital_state.py`

These models are shared between WS1 and WS2. Define them here so MOCAT integration can import them directly.

```python
# backend/app/models/orbital_state.py

from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime

class TLEObject(BaseModel):
    norad_id: int
    name: str
    object_type: Literal["PAYLOAD", "ROCKET BODY", "DEBRIS", "UNKNOWN"]
    epoch: str
    mean_motion: float                  # rev/day
    eccentricity: float                 # 0–1
    inclination: float                  # degrees
    ra_of_asc_node: float               # degrees
    arg_of_pericenter: float            # degrees
    mean_anomaly: float                 # degrees
    bstar: float                        # drag term
    altitude_km: float                  # computed, approximate

class OrbitalCatalogue(BaseModel):
    fetched_at: str
    total_objects: int
    objects: list[TLEObject]

class OrbitalShellBin(BaseModel):
    """Altitude-binned summary for MOCAT input."""
    shell_label: str                    # e.g. "550-600km"
    altitude_min_km: float
    altitude_max_km: float
    payload_count: int
    debris_count: int
    rocket_body_count: int
    total_objects: int

class OrbitalStateSnapshot(BaseModel):
    """
    MOCAT-ready initial state.
    Bins the full catalogue into altitude shells.
    """
    snapshot_id: str
    epoch: str
    shells: list[OrbitalShellBin]
    total_payloads: int
    total_debris: int
    total_rocket_bodies: int
    source: str = "CelesTrak"
```

---

### 1.3 Orbital State Builder

**File:** `backend/app/data/state_builder.py`

Takes the raw catalogue and bins it into altitude shells that MOCAT uses as input.

```python
# backend/app/data/state_builder.py

import uuid
from app.models.orbital_state import (
    OrbitalCatalogue, OrbitalStateSnapshot, OrbitalShellBin
)

# MOCAT uses these standard altitude bins (km)
ALTITUDE_SHELLS = [
    (200, 400), (400, 500), (500, 600), (600, 700),
    (700, 800), (800, 900), (900, 1000), (1000, 1200),
    (1200, 1500), (1500, 2000), (2000, 5000),
]

def build_orbital_state(catalogue: OrbitalCatalogue) -> OrbitalStateSnapshot:
    """
    Bin the full TLE catalogue into altitude shells.
    This is the initial state fed into MIT MOCAT.
    """
    shells = []
    for alt_min, alt_max in ALTITUDE_SHELLS:
        bin_objs = [
            o for o in catalogue.objects
            if alt_min <= o.altitude_km < alt_max
        ]
        shells.append(OrbitalShellBin(
            shell_label=f"{alt_min}-{alt_max}km",
            altitude_min_km=alt_min,
            altitude_max_km=alt_max,
            payload_count=sum(1 for o in bin_objs if o.object_type == "PAYLOAD"),
            debris_count=sum(1 for o in bin_objs if o.object_type == "DEBRIS"),
            rocket_body_count=sum(1 for o in bin_objs if o.object_type == "ROCKET BODY"),
            total_objects=len(bin_objs),
        ))

    return OrbitalStateSnapshot(
        snapshot_id=str(uuid.uuid4()),
        epoch=catalogue.fetched_at,
        shells=shells,
        total_payloads=sum(s.payload_count for s in shells),
        total_debris=sum(s.debris_count for s in shells),
        total_rocket_bodies=sum(s.rocket_body_count for s in shells),
    )
```

---

### 1.4 API Endpoint (expose to WS4)

**File:** `backend/app/routers/data.py`

```python
from fastapi import APIRouter, HTTPException
from app.data.celestrak_fetcher import fetch_full_catalogue, load_cached_catalogue
from app.data.state_builder import build_orbital_state
from app.models.orbital_state import OrbitalStateSnapshot

router = APIRouter(prefix="/api/data", tags=["data"])

@router.get("/orbital-state", response_model=OrbitalStateSnapshot)
async def get_current_orbital_state(force_refresh: bool = False):
    """
    Returns current orbital state snapshot (altitude-binned).
    Uses cache unless force_refresh=true.
    This is the starting point for all MOCAT simulations.
    """
    catalogue = None
    if not force_refresh:
        catalogue = load_cached_catalogue()
    if catalogue is None:
        catalogue = await fetch_full_catalogue()
    return build_orbital_state(catalogue)

@router.get("/catalogue/stats")
async def get_catalogue_stats():
    """Quick stats without full object list — for dashboard KPIs."""
    catalogue = load_cached_catalogue()
    if catalogue is None:
        catalogue = await fetch_full_catalogue()
    return {
        "total_objects": catalogue.total_objects,
        "fetched_at": catalogue.fetched_at,
        "breakdown": {
            t: sum(1 for o in catalogue.objects if o.object_type == t)
            for t in ["PAYLOAD", "DEBRIS", "ROCKET BODY", "UNKNOWN"]
        }
    }
```

---

## Directory Structure

```
backend/
├── app/
│   ├── data/
│   │   ├── __init__.py
│   │   ├── celestrak_fetcher.py     ← you build this
│   │   └── state_builder.py         ← you build this
│   ├── models/
│   │   └── orbital_state.py         ← you build this (shared)
│   └── routers/
│       └── data.py                  ← you build this
└── data/
    └── cache/                       ← auto-created at runtime
```

---

## Testing

```python
# test_data_layer.py

import asyncio
import pytest
from app.data.celestrak_fetcher import fetch_full_catalogue
from app.data.state_builder import build_orbital_state

@pytest.mark.asyncio
async def test_fetch_and_build():
    catalogue = await fetch_full_catalogue()
    assert catalogue.total_objects > 5000, "Should have thousands of tracked objects"

    state = build_orbital_state(catalogue)
    assert len(state.shells) == 11, "Should have 11 altitude bins"
    assert state.total_payloads + state.total_debris + state.total_rocket_bodies <= catalogue.total_objects

def test_altitude_binning_logic():
    """Objects at exactly 550km should land in the 500-600km bin."""
    from app.models.orbital_state import TLEObject
    from app.models.orbital_state import OrbitalCatalogue
    mock_obj = TLEObject(
        norad_id=99999, name="TEST", object_type="DEBRIS",
        epoch="2024-01-01T00:00:00", mean_motion=15.5, eccentricity=0.001,
        inclination=51.6, ra_of_asc_node=0.0, arg_of_pericenter=0.0,
        mean_anomaly=0.0, bstar=0.0001, altitude_km=550.0
    )
    cat = OrbitalCatalogue(fetched_at="2024-01-01T00:00:00", total_objects=1, objects=[mock_obj])
    state = build_orbital_state(cat)
    shell_550 = next(s for s in state.shells if s.shell_label == "500-600km")
    assert shell_550.debris_count == 1
```

---

## Definition of Done

- [ ] `GET /api/data/orbital-state` returns valid `OrbitalStateSnapshot` with real CelesTrak data
- [ ] `GET /api/data/catalogue/stats` returns object counts by type
- [ ] Cache works — second call returns same data without re-fetching
- [ ] All Pydantic models validated and shared with WS2
- [ ] Tests pass
- [ ] Works offline using cached snapshot

---

## Handoff to WS2

When done, share the `OrbitalStateSnapshot` JSON schema with Person B (MOCAT). They need the `shells` array as their simulation starting state.

```bash
# Quick validation — run this to see your output
curl http://localhost:8000/api/data/orbital-state | python3 -m json.tool | head -50
```
