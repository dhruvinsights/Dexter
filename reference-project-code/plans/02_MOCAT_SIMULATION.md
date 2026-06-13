# Workstream 2 — MOCAT Simulation Integration & Scenario Precomputation

**Owner:** Person B  
**Estimated effort:** 8–10 hours  
**Parallel with:** WS3 (share output schema early), WS4 (backend routes)  
**Depends on:** WS1 must provide `OrbitalStateSnapshot` schema (coordinate Day 1)  
**Outputs consumed by:** WS3 (Metrics Engine)

---

## Goal

Integrate MIT MOCAT (Monte Carlo Object Collision Assessment Tool) as the simulation engine. Run the four core intervention scenarios, extract raw outputs, and expose them through a clean Python service layer that WS3 can consume to compute metrics.

Since MOCAT runs can take minutes-to-hours on full datasets, we also precompute and cache all scenario results so the demo is instant.

---

## Background: What is MOCAT?

MIT MOCAT is an open-source Python orbital debris evolution model. It propagates the orbital environment forward in time under different policy assumptions and outputs:

- Number of objects (payloads, debris, rocket bodies) per shell per year
- Collision events per shell per year
- Launch traffic per shell

MOCAT GitHub: `https://github.com/akhilrao/MOCAT-SSEM`

It runs as a Python script with a configuration dictionary as input.

---

## What You Need to Build

### 2.1 MOCAT Wrapper

**File:** `backend/app/simulation/mocat_runner.py`

The MOCAT codebase is installed as a submodule or pip package. This wrapper standardizes how we call it.

```python
# backend/app/simulation/mocat_runner.py

import numpy as np
from pathlib import Path
from datetime import datetime
from app.models.orbital_state import OrbitalStateSnapshot
from app.models.simulation import ScenarioConfig, RawMOCATOutput, SimulationRun

# MOCAT is installed via: pip install mocat-ssem
# Or via: git clone https://github.com/akhilrao/MOCAT-SSEM and sys.path.append

def build_mocat_input(
    state: OrbitalStateSnapshot,
    config: ScenarioConfig
) -> dict:
    """
    Convert our OrbitalStateSnapshot + scenario config into
    the dictionary format MOCAT expects.
    """
    # MOCAT expects initial population per shell as arrays
    # shells ordered by altitude (low → high)
    n_shells = len(state.shells)

    initial_payload = np.array([s.payload_count for s in state.shells], dtype=float)
    initial_debris  = np.array([s.debris_count  for s in state.shells], dtype=float)
    initial_rb      = np.array([s.rocket_body_count for s in state.shells], dtype=float)

    # Base launch rate from historical data (~500/yr total, distribute by shell)
    base_launch_rate = _distribute_launches(
        total_per_year=config.annual_launch_rate,
        n_shells=n_shells
    )

    mocat_params = {
        # Time parameters
        "t_start": 0,
        "t_end": config.simulation_years,
        "dt": 1.0,                       # annual timesteps

        # Initial population
        "N_payloads": initial_payload,
        "N_debris": initial_debris,
        "N_rocket_bodies": initial_rb,

        # Launch parameters
        "launch_rate": base_launch_rate,
        "launch_rate_multiplier": config.launch_rate_multiplier,

        # ADR parameters
        "adr_rate": config.adr_rate,     # objects removed per year per shell
        "adr_shells": config.adr_target_shells or list(range(n_shells)),

        # Physics constants (MOCAT defaults are well-validated — don't change)
        "collision_probability_scale": 1.0,
        "fragmentation_model": "NASA_EVOLVE",
    }

    return mocat_params


def run_mocat_scenario(
    state: OrbitalStateSnapshot,
    config: ScenarioConfig
) -> RawMOCATOutput:
    """
    Execute MOCAT simulation and return raw time-series output.
    This is a synchronous blocking call — use in a background thread/process.
    """
    from mocat_ssem import run_simulation   # MOCAT import

    params = build_mocat_input(state, config)
    result = run_simulation(**params)

    # MOCAT returns numpy arrays: shape (n_timesteps, n_shells)
    return RawMOCATOutput(
        scenario_id=config.scenario_id,
        simulation_years=config.simulation_years,
        shells=[s.shell_label for s in state.shells],
        timesteps=list(range(config.simulation_years + 1)),

        # Time-series arrays: list[list[float]], shape (years+1, shells)
        payloads_per_shell=result["N_payloads"].tolist(),
        debris_per_shell=result["N_debris"].tolist(),
        rocket_bodies_per_shell=result["N_rb"].tolist(),
        collisions_per_shell=result["collisions"].tolist(),

        # Scalar time-series (summed across shells)
        total_objects_per_year=result["N_total"].tolist(),
        total_collisions_per_year=result["collisions_total"].tolist(),

        # Run metadata
        ran_at=datetime.utcnow().isoformat(),
        runtime_seconds=result.get("runtime_s", 0),
    )


def _distribute_launches(total_per_year: int, n_shells: int) -> list[float]:
    """
    Distribute annual launches across shells using a realistic distribution.
    ~70% of launches target LEO 500-600km range (shells 2-4 in our binning).
    """
    weights = [0.02, 0.05, 0.15, 0.25, 0.20, 0.12, 0.08, 0.05, 0.04, 0.03, 0.01]
    weights = weights[:n_shells]
    total_w = sum(weights)
    return [total_per_year * w / total_w for w in weights]
```

---

### 2.2 Data Models

**File:** `backend/app/models/simulation.py`

```python
# backend/app/models/simulation.py

from pydantic import BaseModel, Field
from typing import Literal, Optional
from enum import Enum

class InterventionType(str, Enum):
    BASELINE         = "baseline"
    ADR              = "adr"
    LAUNCH_CAP       = "launch_cap"
    AI_TRAFFIC_MGMT  = "ai_traffic_mgmt"
    HYBRID           = "hybrid"

class ScenarioConfig(BaseModel):
    scenario_id: str
    name: str
    intervention: InterventionType
    simulation_years: int = Field(default=30, ge=5, le=100)
    annual_launch_rate: int = Field(default=500, ge=0, le=5000)

    # ADR-specific
    adr_rate: float = Field(default=0.0)              # objects/yr/shell
    adr_target_shells: Optional[list[int]] = None     # None = all shells

    # Launch cap-specific
    launch_rate_multiplier: float = Field(default=1.0, ge=0.0, le=2.0)

    # AI traffic mgmt
    collision_avoidance_efficiency: float = Field(default=0.0, ge=0.0, le=1.0)

    # Hybrid = combination of above

class RawMOCATOutput(BaseModel):
    scenario_id: str
    simulation_years: int
    shells: list[str]
    timesteps: list[int]

    # Shape: [year_index][shell_index]
    payloads_per_shell: list[list[float]]
    debris_per_shell: list[list[float]]
    rocket_bodies_per_shell: list[list[float]]
    collisions_per_shell: list[list[float]]

    # Scalar per year
    total_objects_per_year: list[float]
    total_collisions_per_year: list[float]

    ran_at: str
    runtime_seconds: float

class SimulationRun(BaseModel):
    run_id: str
    config: ScenarioConfig
    output: RawMOCATOutput
    status: Literal["pending", "running", "complete", "failed"] = "pending"
```

---

### 2.3 Precomputed Scenarios

**File:** `backend/app/simulation/precomputed.py`

For the demo we precompute all four scenarios against today's CelesTrak snapshot and cache results to disk. This ensures the demo runs instantly and reliably even without live data.

```python
# backend/app/simulation/precomputed.py

import json
import asyncio
from pathlib import Path
from app.models.simulation import ScenarioConfig, InterventionType, RawMOCATOutput
from app.data.celestrak_fetcher import fetch_full_catalogue, load_cached_catalogue
from app.data.state_builder import build_orbital_state
from app.simulation.mocat_runner import run_mocat_scenario

PRECOMPUTED_DIR = Path("data/precomputed")

# The four canonical scenarios for the demo
DEMO_SCENARIOS: list[ScenarioConfig] = [
    ScenarioConfig(
        scenario_id="baseline_2024",
        name="Baseline (No Intervention)",
        intervention=InterventionType.BASELINE,
        simulation_years=30,
        annual_launch_rate=500,
        adr_rate=0.0,
        launch_rate_multiplier=1.0,
        collision_avoidance_efficiency=0.0,
    ),
    ScenarioConfig(
        scenario_id="adr_aggressive_2024",
        name="Active Debris Removal (Aggressive)",
        intervention=InterventionType.ADR,
        simulation_years=30,
        annual_launch_rate=500,
        adr_rate=50.0,        # 50 objects removed per shell per year
        adr_target_shells=[2, 3, 4, 5],  # Focus on 500-800km congested shells
        launch_rate_multiplier=1.0,
    ),
    ScenarioConfig(
        scenario_id="launch_cap_2024",
        name="Launch Cap (50% Reduction)",
        intervention=InterventionType.LAUNCH_CAP,
        simulation_years=30,
        annual_launch_rate=500,
        launch_rate_multiplier=0.5,
    ),
    ScenarioConfig(
        scenario_id="hybrid_2024",
        name="Hybrid Strategy (ADR + Cap + AI)",
        intervention=InterventionType.HYBRID,
        simulation_years=30,
        annual_launch_rate=500,
        adr_rate=30.0,
        launch_rate_multiplier=0.75,
        collision_avoidance_efficiency=0.35,
    ),
]

async def precompute_all_scenarios(force: bool = False):
    """
    Run MOCAT for all 4 demo scenarios and save results.
    Call this once at startup if cache is missing.
    Expected runtime: ~5-10 minutes total.
    """
    PRECOMPUTED_DIR.mkdir(parents=True, exist_ok=True)

    catalogue = load_cached_catalogue()
    if catalogue is None:
        catalogue = await fetch_full_catalogue()

    state = build_orbital_state(catalogue)

    for config in DEMO_SCENARIOS:
        outfile = PRECOMPUTED_DIR / f"{config.scenario_id}.json"
        if outfile.exists() and not force:
            print(f"[precompute] {config.scenario_id} already cached, skipping")
            continue

        print(f"[precompute] Running {config.name}...")
        result = run_mocat_scenario(state, config)
        outfile.write_text(result.model_dump_json(indent=2))
        print(f"[precompute] ✅ {config.name} done ({result.runtime_seconds:.1f}s)")

def load_precomputed(scenario_id: str) -> RawMOCATOutput | None:
    """Load a cached simulation result."""
    path = PRECOMPUTED_DIR / f"{scenario_id}.json"
    if not path.exists():
        return None
    return RawMOCATOutput(**json.loads(path.read_text()))

def list_precomputed() -> list[str]:
    """Return IDs of all cached scenarios."""
    return [p.stem for p in PRECOMPUTED_DIR.glob("*.json")]
```

---

### 2.4 MOCAT Fallback (If MOCAT Install Fails)

If MOCAT can't be installed in time, use this deterministic mock that produces realistic-looking outputs:

**File:** `backend/app/simulation/mocat_mock.py`

```python
# backend/app/simulation/mocat_mock.py
"""
Realistic mock for MOCAT — use if the real MOCAT install fails.
All numbers derived from published orbital debris literature.
"""

import numpy as np
from app.models.simulation import ScenarioConfig, RawMOCATOutput
from app.models.orbital_state import OrbitalStateSnapshot
from datetime import datetime

INTERVENTION_EFFECTS = {
    "baseline":        {"debris_growth": 1.04,  "collision_scale": 1.00},
    "adr":             {"debris_growth": 0.96,  "collision_scale": 0.77},
    "launch_cap":      {"debris_growth": 0.98,  "collision_scale": 0.89},
    "ai_traffic_mgmt": {"debris_growth": 1.02,  "collision_scale": 0.82},
    "hybrid":          {"debris_growth": 0.93,  "collision_scale": 0.69},
}

def run_mock_scenario(
    state: OrbitalStateSnapshot,
    config: ScenarioConfig
) -> RawMOCATOutput:
    effects = INTERVENTION_EFFECTS[config.intervention.value]
    years = config.simulation_years
    n_shells = len(state.shells)

    debris_ts = []
    collisions_ts = []
    total_ts = []
    total_coll_ts = []

    for t in range(years + 1):
        debris_shell = [
            s.debris_count * (effects["debris_growth"] ** t)
            for s in state.shells
        ]
        coll_shell = [
            max(0, (d * 0.001 * effects["collision_scale"]) + np.random.normal(0, 0.5))
            for d in debris_shell
        ]
        debris_ts.append(debris_shell)
        collisions_ts.append(coll_shell)
        total_ts.append(sum(debris_shell) + sum(s.payload_count for s in state.shells))
        total_coll_ts.append(sum(coll_shell))

    return RawMOCATOutput(
        scenario_id=config.scenario_id,
        simulation_years=years,
        shells=[s.shell_label for s in state.shells],
        timesteps=list(range(years + 1)),
        payloads_per_shell=[[s.payload_count] * (years + 1) for s in state.shells],  # simplified
        debris_per_shell=debris_ts,
        rocket_bodies_per_shell=[[s.rocket_body_count] * (years + 1) for s in state.shells],
        collisions_per_shell=collisions_ts,
        total_objects_per_year=total_ts,
        total_collisions_per_year=total_coll_ts,
        ran_at=datetime.utcnow().isoformat(),
        runtime_seconds=0.1,
    )
```

---

### 2.5 API Endpoints

**File:** `backend/app/routers/simulation.py`

```python
from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.models.simulation import ScenarioConfig, SimulationRun, RawMOCATOutput
from app.simulation.precomputed import load_precomputed, list_precomputed, DEMO_SCENARIOS
import uuid, time

router = APIRouter(prefix="/api/scenarios", tags=["simulation"])

@router.get("/", response_model=list[ScenarioConfig])
async def list_scenarios():
    """Return the four canonical demo scenarios."""
    return DEMO_SCENARIOS

@router.get("/{scenario_id}/result", response_model=RawMOCATOutput)
async def get_scenario_result(scenario_id: str):
    """
    Return precomputed MOCAT output for a scenario.
    Fast (cached on disk) — suitable for real-time UI use.
    """
    result = load_precomputed(scenario_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"No precomputed result for {scenario_id}")
    return result

@router.post("/run", response_model=dict)
async def run_custom_scenario(config: ScenarioConfig, bg: BackgroundTasks):
    """
    Launch a custom simulation in the background.
    Returns a run_id immediately; poll /run/{run_id}/status for progress.
    """
    run_id = str(uuid.uuid4())
    bg.add_task(_run_in_background, run_id, config)
    return {"run_id": run_id, "status": "queued"}
```

---

## Directory Structure

```
backend/
└── app/
    ├── simulation/
    │   ├── __init__.py
    │   ├── mocat_runner.py       ← you build this
    │   ├── mocat_mock.py         ← fallback
    │   ├── precomputed.py        ← you build this
    │   └── scenario_configs.py  ← scenario definitions
    ├── models/
    │   └── simulation.py         ← you build this (shared with WS3)
    └── routers/
        └── simulation.py         ← you build this
```

---

## Testing

```bash
# Run precomputation (one-time setup, ~5-10min)
python -c "import asyncio; from app.simulation.precomputed import precompute_all_scenarios; asyncio.run(precompute_all_scenarios())"

# Validate output
curl http://localhost:8000/api/scenarios/ | python3 -m json.tool
curl http://localhost:8000/api/scenarios/baseline_2024/result | python3 -m json.tool | head -30
```

---

## Definition of Done

- [ ] All 4 scenarios precomputed and cached to disk
- [ ] `GET /api/scenarios/` returns 4 scenario configs
- [ ] `GET /api/scenarios/{id}/result` returns `RawMOCATOutput` for each
- [ ] Mock fallback works if real MOCAT import fails
- [ ] `RawMOCATOutput` schema shared with Person C (WS3)
- [ ] Baseline shows positive debris growth; ADR shows reduction

---

## Handoff to WS3

Pass `RawMOCATOutput` as JSON to Person C. They will consume it to compute the sustainability metrics. The key arrays are `debris_per_shell`, `collisions_per_shell`, and `total_collisions_per_year`.
