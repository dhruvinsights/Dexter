import sys
import os
from datetime import datetime, timezone, timedelta
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

# Ensure python can locate shared packages
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from backend.shared.physics.kepler import propagate_kepler, orbital_elements_to_cartesian
from backend.shared.physics.sgp4_propagator import propagate_tle, parse_tle_metadata
from backend.shared.policy.rules import (
    ADRPolicy,
    LaunchCapPolicy,
    DeorbitPolicy,
    TrafficManagementPolicy,
    SimulationObject,
    OrbitalEnvironment,
    BasePolicy
)
from backend.shared.scenario.engine import ScenarioConfig, ScenarioRunner, ScenarioRunResult

app = FastAPI(title="Orbital Sentinel - Core Engine APIs", version="1.0.0")

# --- Schemas ---

class KeplerPropRequest(BaseModel):
    a_km: float = Field(..., description="Semi-major axis in km")
    e: float = Field(..., description="Eccentricity")
    i_deg: float = Field(..., description="Inclination in degrees")
    Omega_deg: float = Field(..., description="RAAN in degrees")
    omega_deg: float = Field(..., description="Argument of perigee in degrees")
    nu_deg: float = Field(..., description="True anomaly in degrees")
    time_seconds: float = Field(..., description="Propagation duration in seconds")

class CartesianState(BaseModel):
    position: List[float] = Field(..., description="ECI position [x, y, z] in km")
    velocity: List[float] = Field(..., description="ECI velocity [vx, vy, vz] in km/s")

class KeplerPropResponse(BaseModel):
    a_km: float
    e: float
    i_deg: float
    Omega_deg: float
    omega_deg: float
    nu_deg: float
    cartesian: CartesianState

class TLEPropRequest(BaseModel):
    line1: str = Field(..., description="TLE Line 1")
    line2: str = Field(..., description="TLE Line 2")
    target_time: str = Field(..., description="Target timestamp in ISO format (e.g. 2026-06-14T03:15:00)")

class TLEPropResponse(BaseModel):
    norad_id: int
    epoch: str
    position: List[float]
    velocity: List[float]

class SpaceParticle(BaseModel):
    id: str
    position: List[float] # [x, y, z] in km
    radius_m: float

class ConjunctionCheckRequest(BaseModel):
    particles: List[SpaceParticle]
    threshold_m: float = Field(default=1000.0, description="Minimum close approach distance to flag (meters)")

class CloseApproach(BaseModel):
    object_1_id: str
    object_2_id: str
    miss_distance_m: float

class PolicyConfig(BaseModel):
    policy_type: str = Field(..., description="ADR, LAUNCH_CAP, DEORBIT, or TRAFFIC")
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict)

class ScenarioRunRequest(BaseModel):
    name: str
    duration_days: int = Field(default=30)
    time_step_hours: int = Field(default=24)
    policies: List[PolicyConfig] = Field(default_factory=list)
    initial_objects: List[SimulationObject] = Field(default_factory=list)

class ScenarioComparisonResult(BaseModel):
    baseline_metrics: Dict[str, float]
    comparison_summaries: Dict[str, Dict[str, float]]

# --- Policy Helper Factory ---

def create_policy_instance(config: PolicyConfig) -> BasePolicy:
    ptype = config.policy_type.upper()
    params = config.parameters or {}
    if ptype == "ADR":
        return ADRPolicy(
            removal_rate_per_year=params.get("removal_rate_per_year", 5),
            target_metric=params.get("target_metric", "mass")
        )
    elif ptype == "LAUNCH_CAP":
        return LaunchCapPolicy(
            max_launches_per_year=params.get("max_launches_per_year", 50),
            altitude_range_km=tuple(params.get("altitude_range_km", (600.0, 1000.0)))
        )
    elif ptype == "DEORBIT":
        return DeorbitPolicy(
            active_lifetime_years=params.get("active_lifetime_years", 10.0),
            compliance_rate=params.get("compliance_rate", 0.9)
        )
    elif ptype == "TRAFFIC":
        return TrafficManagementPolicy(
            probability_threshold=params.get("probability_threshold", 1e-4),
            delta_v_burn_m_s=params.get("delta_v_burn_m_s", 5.0)
        )
    else:
        raise ValueError(f"Unknown policy type: {config.policy_type}")

# --- Routes ---

@app.get("/")
def read_root():
    return {"status": "CORE_ENGINE_APIS_OPERATIONAL"}

@app.post("/api/v1/physics/propagate/kepler", response_model=KeplerPropResponse)
def propagate_kepler_route(req: KeplerPropRequest):
    try:
        a_km, e, i_deg, Omega_deg, omega_deg, nu_new = propagate_kepler(
            req.a_km, req.e, req.i_deg, req.Omega_deg, req.omega_deg, req.nu_deg, req.time_seconds
        )
        pos, vel = orbital_elements_to_cartesian(a_km, e, i_deg, Omega_deg, omega_deg, nu_new)
        return KeplerPropResponse(
            a_km=a_km, e=e, i_deg=i_deg, Omega_deg=Omega_deg, omega_deg=omega_deg, nu_deg=nu_new,
            cartesian=CartesianState(position=pos.tolist(), velocity=vel.tolist())
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Kepler propagation failed: {str(e)}")

@app.post("/api/v1/physics/propagate/tle", response_model=TLEPropResponse)
def propagate_tle_route(req: TLEPropRequest):
    try:
        dt = datetime.fromisoformat(req.target_time)
        meta = parse_tle_metadata(req.line1, req.line2)
        pos, vel = propagate_tle(req.line1, req.line2, dt)
        return TLEPropResponse(
            norad_id=meta["norad_id"], epoch=dt.isoformat(),
            position=pos.tolist(), velocity=vel.tolist()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SGP4 propagation failed: {str(e)}")

@app.post("/api/v1/physics/conjunctions/check", response_model=List[CloseApproach])
def check_conjunctions_route(req: ConjunctionCheckRequest):
    conjunctions = []
    n = len(req.particles)
    for i in range(n):
        p1 = req.particles[i]
        for j in range(i + 1, n):
            p2 = req.particles[j]
            dx = p1.position[0] - p2.position[0]
            dy = p1.position[1] - p2.position[1]
            dz = p1.position[2] - p2.position[2]
            dist_km = (dx**2 + dy**2 + dz**2)**0.5
            dist_m = dist_km * 1000.0
            hbr_m = p1.radius_m + p2.radius_m
            miss_distance = dist_m - hbr_m
            if miss_distance <= req.threshold_m:
                conjunctions.append(
                    CloseApproach(
                        object_1_id=p1.id, object_2_id=p2.id,
                        miss_distance_m=max(0.0, miss_distance)
                    )
                )
    return conjunctions

@app.post("/api/v1/scenarios/run", response_model=ScenarioRunResult)
def run_scenario_route(req: ScenarioRunRequest):
    try:
        policies = [create_policy_instance(p) for p in req.policies]
        config = ScenarioConfig(
            name=req.name,
            duration_days=req.duration_days,
            time_step_hours=req.time_step_hours,
            active_policies=policies
        )
        
        # Build initial environment
        initial_time = datetime.now(timezone.utc)
        objects_dict = {obj.id: obj for obj in req.initial_objects}
        initial_env = OrbitalEnvironment(epoch=initial_time, objects=objects_dict)
        
        runner = ScenarioRunner(config, initial_env)
        result = runner.run()
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Scenario execution failed: {str(e)}")

@app.post("/api/v1/scenarios/compare", response_model=ScenarioComparisonResult)
def compare_scenarios_route(req: ScenarioRunRequest):
    """
    Runs a baseline scenario (no policies) and a policy-driven scenario
    side-by-side on the exact same initial objects environment.
    """
    try:
        initial_time = datetime.now(timezone.utc)
        objects_dict = {obj.id: obj for obj in req.initial_objects}
        initial_env = OrbitalEnvironment(epoch=initial_time, objects=objects_dict)
        
        # 1. Run Baseline (no policies)
        baseline_config = ScenarioConfig(
            name="Baseline Run",
            duration_days=req.duration_days,
            time_step_hours=req.time_step_hours,
            active_policies=[]
        )
        baseline_runner = ScenarioRunner(baseline_config, initial_env)
        baseline_res = baseline_runner.run()
        
        # 2. Run Policy Cases
        policies = [create_policy_instance(p) for p in req.policies]
        policy_config = ScenarioConfig(
            name=req.name,
            duration_days=req.duration_days,
            time_step_hours=req.time_step_hours,
            active_policies=policies
        )
        policy_runner = ScenarioRunner(policy_config, initial_env)
        policy_res = policy_runner.run()
        
        return ScenarioComparisonResult(
            baseline_metrics=baseline_res.final_metrics,
            comparison_summaries={
                req.name: policy_res.final_metrics
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Scenario comparison failed: {str(e)}")

@app.get("/api/v1/catalog/fetch/{group}")
def fetch_catalog_group_route(group: str):
    """
    Fetches raw TLE sets from CelesTrak for a given catalog group,
    parses them, and returns parsed objects.
    """
    from backend.services.catalog.app.core.celestrak import fetch_celestrak_tles, parse_raw_tles
    try:
        raw_tle_text = fetch_celestrak_tles(group)
        parsed_objects = list(parse_raw_tles(raw_tle_text))
        # Cap returned results in API response to keep payload reasonable
        return parsed_objects[:200]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Catalog fetch failed: {str(e)}")

@app.websocket("/api/v1/simulation/stream")
async def simulation_stream(websocket: WebSocket):
    """
    Exposes a WebSocket streaming channel to feed state-vectors directly to KeepTrack.
    """
    await websocket.accept()
    
    # Establish dynamic database session
    from backend.shared.database import SessionLocal
    from backend.shared.models import SpaceObject, RawTLE
    from sgp4.api import Satrec, jday
    
    db = SessionLocal()
    try:
        # Await optional configuration from client (timeout in case it is just streaming default)
        try:
            config = await asyncio.wait_for(websocket.receive_json(), timeout=2.0)
        except asyncio.TimeoutError:
            config = {}
            
        group = config.get("group", "active")
        speed_multiplier = float(config.get("speed_multiplier", 10.0)) # simulation seconds per update frame
        
        # Load space objects that have associated TLEs from local cache / database
        db_objects = db.query(SpaceObject).join(RawTLE).limit(200).all()
        
        satrec_list = []
        for obj in db_objects:
            tle = db.query(RawTLE).filter(RawTLE.space_object_id == obj.id).order_by(RawTLE.epoch.desc()).first()
            if tle:
                try:
                    satrec = Satrec.twoline2rv(tle.line1, tle.line2)
                    satrec_list.append({
                        "id": str(obj.id),
                        "norad_id": obj.norad_id,
                        "name": obj.name,
                        "satrec": satrec
                    })
                except Exception:
                    continue
                    
        if not satrec_list:
            await websocket.send_json({"error": "No objects found in database to simulate."})
            await websocket.close()
            return
            
        sim_time = datetime.now(timezone.utc)
        
        while True:
            sim_time += timedelta(seconds=speed_multiplier)
            
            jd, fr = jday(
                sim_time.year, sim_time.month, sim_time.day,
                sim_time.hour, sim_time.minute, sim_time.second + sim_time.microsecond / 1e6
            )
            
            states = []
            for item in satrec_list:
                e, r, v = item["satrec"].sgp4(jd, fr)
                if e == 0:
                    states.append({
                        "id": item["id"],
                        "name": item["name"],
                        "position": [float(r[0]), float(r[1]), float(r[2])],
                        "velocity": [float(v[0]), float(v[1]), float(v[2])]
                    })
            
            await websocket.send_json({
                "epoch": sim_time.isoformat(),
                "states": states
            })
            
            # Send updates at 10 Hz
            await asyncio.sleep(0.1)
            
    except WebSocketDisconnect:
        pass
    except Exception as ex:
        try:
            await websocket.send_json({"error": str(ex)})
        except Exception:
            pass
    finally:
        db.close()


