# Workstream 3 — Metrics Extraction Engine & Sustainability Score

**Owner:** Person C  
**Estimated effort:** 5–6 hours  
**Parallel with:** WS4 (FastAPI) — share output schema early  
**Depends on:** WS2 must provide `RawMOCATOutput` schema (get it Day 1)  
**Outputs consumed by:** WS4 (backend), WS5 (AI Agent), WS6 (Frontend charts)

---

## Goal

Transform raw MOCAT time-series arrays into meaningful, human-readable sustainability metrics — and compute a single **Sustainability Score (0–100)** per scenario that can be compared, ranked, and explained.

This is the analytical heart of Orbital Sentinel. Everything the AI Analyst says and everything the frontend displays is derived from these metrics.

---

## The Five Core Metrics

| Metric | What it measures | Source |
|---|---|---|
| **Collision Frequency** | Average collision events per year (final 10yr window) | `total_collisions_per_year` |
| **Debris Growth Rate** | % change in total debris over simulation period | `debris_per_shell` |
| **Survivability Index** | % of payloads surviving without collision (final year) | Derived from payloads + collisions |
| **Congestion Index** | Normalized density of objects in the 500–800km critical shell | `payloads + debris + rb` per shell |
| **Cost Efficiency** | Estimated USD cost per unit of debris reduced | Config + debris reduction |

---

## What You Need to Build

### 3.1 Metrics Extractor

**File:** `backend/app/metrics/extractor.py`

```python
# backend/app/metrics/extractor.py

from app.models.simulation import RawMOCATOutput
from app.models.metrics import ScenarioMetrics, ShellMetrics, TimeSeriesPoint

def extract_metrics(
    output: RawMOCATOutput,
    baseline: RawMOCATOutput | None = None
) -> ScenarioMetrics:
    """
    Extract all sustainability metrics from raw MOCAT output.
    
    If `baseline` is provided, compute relative improvements vs baseline.
    If not (i.e. this IS the baseline), relative metrics will be None.
    """
    years = output.simulation_years
    n_shells = len(output.shells)

    # --- Collision Frequency ---
    # Average of last 10 years (steady-state behavior, not transient)
    window = output.total_collisions_per_year[-10:]
    collision_frequency = sum(window) / len(window)

    # --- Debris Growth Rate ---
    initial_debris = sum(output.debris_per_shell[0])
    final_debris   = sum(output.debris_per_shell[-1])
    debris_growth_pct = ((final_debris - initial_debris) / max(initial_debris, 1)) * 100

    # --- Survivability Index ---
    # Simplified: 1 - (cumulative_collision_events / initial_payload_count)
    total_payloads_initial = sum(output.payloads_per_shell[0])
    cumulative_collisions = sum(output.total_collisions_per_year)
    survivability = max(0.0, 1.0 - (cumulative_collisions / max(total_payloads_initial * years, 1)))
    survivability_pct = survivability * 100

    # --- Congestion Index ---
    # Focus on 500–800km shells (indices 2–5 in our standard binning)
    congested_shells = [2, 3, 4, 5]  # 500-600, 600-700, 700-800km
    congestion_values = []
    for t in range(years + 1):
        shell_total = sum(
            output.debris_per_shell[t][i] +
            output.payloads_per_shell[t][i] +
            output.rocket_bodies_per_shell[t][i]
            for i in congested_shells if i < n_shells
        )
        congestion_values.append(shell_total)
    congestion_index = congestion_values[-1] / max(congestion_values[0], 1) * 100

    # --- Per-shell breakdown ---
    shell_metrics = []
    for i, shell_label in enumerate(output.shells):
        d0 = output.debris_per_shell[0][i]
        df = output.debris_per_shell[-1][i]
        c_total = sum(output.collisions_per_shell[t][i] for t in range(years + 1))
        shell_metrics.append(ShellMetrics(
            shell_label=shell_label,
            initial_debris=d0,
            final_debris=df,
            debris_change_pct=((df - d0) / max(d0, 1)) * 100,
            total_collisions=c_total,
        ))

    # --- Time series for charts ---
    collision_ts = [
        TimeSeriesPoint(year=t, value=output.total_collisions_per_year[t])
        for t in range(years + 1)
    ]
    debris_ts = [
        TimeSeriesPoint(year=t, value=sum(output.debris_per_shell[t]))
        for t in range(years + 1)
    ]
    total_objects_ts = [
        TimeSeriesPoint(year=t, value=output.total_objects_per_year[t])
        for t in range(years + 1)
    ]

    # --- Baseline comparison (if provided) ---
    collision_reduction_pct = None
    debris_reduction_pct = None
    if baseline:
        baseline_collisions = sum(baseline.total_collisions_per_year[-10:]) / 10
        collision_reduction_pct = (
            (baseline_collisions - collision_frequency) / max(baseline_collisions, 1)
        ) * 100

        baseline_final_debris = sum(baseline.debris_per_shell[-1])
        debris_reduction_pct = (
            (baseline_final_debris - final_debris) / max(baseline_final_debris, 1)
        ) * 100

    return ScenarioMetrics(
        scenario_id=output.scenario_id,
        collision_frequency=round(collision_frequency, 2),
        debris_growth_pct=round(debris_growth_pct, 1),
        survivability_pct=round(survivability_pct, 1),
        congestion_index=round(congestion_index, 1),
        collision_reduction_pct=round(collision_reduction_pct, 1) if collision_reduction_pct is not None else None,
        debris_reduction_pct=round(debris_reduction_pct, 1) if debris_reduction_pct is not None else None,
        shell_breakdown=shell_metrics,
        collision_time_series=collision_ts,
        debris_time_series=debris_ts,
        total_objects_time_series=total_objects_ts,
    )
```

---

### 3.2 Sustainability Score Engine

**File:** `backend/app/metrics/scoring.py`

The sustainability score is a weighted composite of all five metrics, normalized to 0–100. Higher = more sustainable.

```python
# backend/app/metrics/scoring.py

from app.models.metrics import ScenarioMetrics, SustainabilityScore

# Weights must sum to 1.0
# Source: Adapted from ESA Space Debris Mitigation Guidelines weighting rationale
WEIGHTS = {
    "collision_reduction": 0.30,   # Highest weight — direct safety impact
    "debris_reduction":    0.25,   # Long-term environment health
    "survivability":       0.20,   # Operational mission success
    "congestion_reduction":0.15,   # Critical shell health
    "cost_efficiency":     0.10,   # Implementation feasibility
}

def compute_sustainability_score(
    metrics: ScenarioMetrics,
    cost_efficiency_score: float = 50.0,  # 0-100, provided by WS4/config
) -> SustainabilityScore:
    """
    Compute a 0-100 sustainability score.
    
    Each component is normalized to 0-100 before weighting.
    Components use the baseline-relative metrics where available,
    or absolute metrics normalized against expected ranges.
    """

    # Normalize each component to 0-100
    # Collision reduction: 0% = 0 points, 50%+ reduction = 100 points
    collision_score = _clamp(
        (metrics.collision_reduction_pct or 0) / 50 * 100
    )

    # Debris reduction: -20% growth (bad) to +30% reduction (great) → 0-100
    debris_score = _clamp(
        ((metrics.debris_reduction_pct or 0) + 20) / 50 * 100
    )

    # Survivability: direct 0-100 percentage
    survivability_score = _clamp(metrics.survivability_pct)

    # Congestion index: lower is better
    # 130+ = bad (0pts), 70 or below = great (100pts)
    congestion_score = _clamp(
        (130 - metrics.congestion_index) / 60 * 100
    )

    # Cost efficiency: passed in externally (ADR is expensive, launch cap is cheap)
    cost_score = _clamp(cost_efficiency_score)

    # Weighted sum
    total = (
        WEIGHTS["collision_reduction"] * collision_score +
        WEIGHTS["debris_reduction"]    * debris_score +
        WEIGHTS["survivability"]       * survivability_score +
        WEIGHTS["congestion_reduction"]* congestion_score +
        WEIGHTS["cost_efficiency"]     * cost_score
    )

    return SustainabilityScore(
        scenario_id=metrics.scenario_id,
        total_score=round(total, 1),
        grade=_score_to_grade(total),
        component_scores={
            "collision_reduction": round(collision_score, 1),
            "debris_reduction":    round(debris_score, 1),
            "survivability":       round(survivability_score, 1),
            "congestion_reduction":round(congestion_score, 1),
            "cost_efficiency":     round(cost_score, 1),
        },
        weights=WEIGHTS,
    )

def _clamp(v: float, lo: float = 0, hi: float = 100) -> float:
    return max(lo, min(hi, v))

def _score_to_grade(score: float) -> str:
    if score >= 80: return "A"
    if score >= 65: return "B"
    if score >= 50: return "C"
    if score >= 35: return "D"
    return "F"
```

---

### 3.3 Data Models

**File:** `backend/app/models/metrics.py`

```python
# backend/app/models/metrics.py

from pydantic import BaseModel
from typing import Optional

class TimeSeriesPoint(BaseModel):
    year: int
    value: float

class ShellMetrics(BaseModel):
    shell_label: str
    initial_debris: float
    final_debris: float
    debris_change_pct: float
    total_collisions: float

class ScenarioMetrics(BaseModel):
    scenario_id: str
    collision_frequency: float           # avg collisions/yr (last 10yr)
    debris_growth_pct: float             # % change over full period
    survivability_pct: float             # % (0-100)
    congestion_index: float              # relative to initial (100 = unchanged)
    collision_reduction_pct: Optional[float]  # vs baseline
    debris_reduction_pct: Optional[float]     # vs baseline
    shell_breakdown: list[ShellMetrics]
    collision_time_series: list[TimeSeriesPoint]
    debris_time_series: list[TimeSeriesPoint]
    total_objects_time_series: list[TimeSeriesPoint]

class SustainabilityScore(BaseModel):
    scenario_id: str
    total_score: float                   # 0-100
    grade: str                           # A/B/C/D/F
    component_scores: dict[str, float]
    weights: dict[str, float]

class ComparisonResult(BaseModel):
    """Side-by-side metrics for the Policy Comparison view."""
    scenarios: list[str]
    metrics: dict[str, ScenarioMetrics]   # keyed by scenario_id
    scores: dict[str, SustainabilityScore]
    winner: str                            # scenario_id with highest score
    ranked: list[str]                      # scenario_ids sorted by score desc
```

---

### 3.4 Comparison Engine

**File:** `backend/app/metrics/comparator.py`

```python
# backend/app/metrics/comparator.py

from app.models.metrics import ComparisonResult, ScenarioMetrics, SustainabilityScore
from app.metrics.scoring import compute_sustainability_score

COST_ESTIMATES = {
    "baseline":          90.0,   # Low cost (no action)
    "adr":               25.0,   # Very expensive
    "launch_cap":        70.0,   # Policy-only, relatively cheap
    "ai_traffic_mgmt":   60.0,   # Moderate
    "hybrid":            45.0,   # Moderate-expensive
}

def compare_scenarios(
    metrics_list: list[ScenarioMetrics],
    intervention_types: dict[str, str],  # scenario_id → intervention type
) -> ComparisonResult:
    metrics_map = {m.scenario_id: m for m in metrics_list}

    scores_map = {}
    for m in metrics_list:
        intervention = intervention_types.get(m.scenario_id, "baseline")
        cost_score = COST_ESTIMATES.get(intervention, 50.0)
        scores_map[m.scenario_id] = compute_sustainability_score(m, cost_score)

    ranked = sorted(
        scores_map.keys(),
        key=lambda sid: scores_map[sid].total_score,
        reverse=True
    )

    return ComparisonResult(
        scenarios=list(metrics_map.keys()),
        metrics=metrics_map,
        scores=scores_map,
        winner=ranked[0],
        ranked=ranked,
    )
```

---

### 3.5 API Endpoints

**File:** `backend/app/routers/metrics.py`

```python
from fastapi import APIRouter, HTTPException
from app.simulation.precomputed import load_precomputed, DEMO_SCENARIOS
from app.metrics.extractor import extract_metrics
from app.metrics.scoring import compute_sustainability_score
from app.metrics.comparator import compare_scenarios, COST_ESTIMATES
from app.models.metrics import ScenarioMetrics, SustainabilityScore, ComparisonResult

router = APIRouter(prefix="/api/metrics", tags=["metrics"])

@router.get("/{scenario_id}", response_model=ScenarioMetrics)
async def get_metrics(scenario_id: str):
    output = load_precomputed(scenario_id)
    baseline = load_precomputed("baseline_2024")
    if not output:
        raise HTTPException(404, detail=f"Scenario {scenario_id} not found")
    return extract_metrics(output, baseline if scenario_id != "baseline_2024" else None)

@router.get("/{scenario_id}/score", response_model=SustainabilityScore)
async def get_score(scenario_id: str):
    output = load_precomputed(scenario_id)
    baseline = load_precomputed("baseline_2024")
    if not output:
        raise HTTPException(404, detail=f"Scenario {scenario_id} not found")
    m = extract_metrics(output, baseline)
    intervention = next(
        (s.intervention.value for s in DEMO_SCENARIOS if s.scenario_id == scenario_id), "baseline"
    )
    return compute_sustainability_score(m, COST_ESTIMATES.get(intervention, 50.0))

@router.get("/compare/all", response_model=ComparisonResult)
async def compare_all():
    """Compare all 4 demo scenarios. Primary endpoint for Policy Comparison page."""
    metrics_list = []
    interventions = {}
    baseline = load_precomputed("baseline_2024")
    for config in DEMO_SCENARIOS:
        output = load_precomputed(config.scenario_id)
        if output:
            metrics_list.append(extract_metrics(
                output,
                baseline if config.scenario_id != "baseline_2024" else None
            ))
            interventions[config.scenario_id] = config.intervention.value
    return compare_scenarios(metrics_list, interventions)
```

---

## Definition of Done

- [ ] `GET /api/metrics/{scenario_id}` returns valid `ScenarioMetrics`
- [ ] `GET /api/metrics/{scenario_id}/score` returns `SustainabilityScore` with grade
- [ ] `GET /api/metrics/compare/all` returns ranked comparison of all 4 scenarios
- [ ] Hybrid strategy scores higher than Baseline (validates model correctness)
- [ ] All time series have correct length (years + 1 data points)
- [ ] Unit tests for scoring formula edge cases (0, 100, negative values)
