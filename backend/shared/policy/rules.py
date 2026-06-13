from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class SimulationObject(BaseModel):
    id: str
    name: str
    object_type: str  # SATELLITE, DEBRIS, ROCKET_BODY
    position: List[float]  # ECI [x, y, z] in km
    velocity: List[float]  # ECI [vx, vy, vz] in km/s
    mass_kg: float
    cross_section_area: float  # m^2
    launch_date: datetime
    operational_status: str  # ACTIVE, INACTIVE, DECAYED
    fuel_delta_v_m_s: float = Field(default=500.0, description="Available delta-v budget for evasion maneuvers")
    inclination_deg: float
    semi_major_axis_km: float

class EnvironmentMutation(BaseModel):
    remove_object_ids: List[str] = Field(default_factory=list)
    modify_object_states: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    canceled_launch_ids: List[str] = Field(default_factory=list)

class OrbitalEnvironment(BaseModel):
    epoch: datetime
    objects: Dict[str, SimulationObject] = Field(default_factory=dict)
    pending_launches: List[Dict[str, Any]] = Field(default_factory=list)

    def get_by_type(self, object_type: str) -> List[SimulationObject]:
        return [obj for obj in self.objects.values() if obj.object_type == object_type]

class BasePolicy(ABC):
    @abstractmethod
    def evaluate(self, env: OrbitalEnvironment, context: Optional[Dict[str, Any]] = None) -> EnvironmentMutation:
        """
        Evaluate the policy rule against the environment state.
        Returns the environment mutation to apply.
        """
        pass

# 1. Active Debris Removal (ADR) Policy
class ADRPolicy(BasePolicy):
    def __init__(self, removal_rate_per_year: int, target_metric: str = "mass"):
        self.removal_rate = removal_rate_per_year
        self.target_metric = target_metric

    def evaluate(self, env: OrbitalEnvironment, context: Optional[Dict[str, Any]] = None) -> EnvironmentMutation:
        debris_list = env.get_by_type("DEBRIS")
        if not debris_list:
            return EnvironmentMutation()

        # Sort debris by mass (highest mass = highest threat when fragmented)
        if self.target_metric == "mass":
            sorted_debris = sorted(debris_list, key=lambda x: x.mass_kg, reverse=True)
        else:
            # Fallback to simple sorting
            sorted_debris = sorted(debris_list, key=lambda x: x.id)

        # Select top N debris to remove
        targets = [d.id for d in sorted_debris[:self.removal_rate]]
        return EnvironmentMutation(remove_object_ids=targets)

# 2. Launch Cap Policy (Limits launch rates in congested altitude bands)
class LaunchCapPolicy(BasePolicy):
    def __init__(self, max_launches_per_year: int, altitude_range_km: tuple = (600.0, 1000.0)):
        self.max_launches = max_launches_per_year
        self.alt_min, self.alt_max = altitude_range_km

    def evaluate(self, env: OrbitalEnvironment, context: Optional[Dict[str, Any]] = None) -> EnvironmentMutation:
        canceled_ids = []
        congested_launches = 0
        
        # Sort pending launches and cancel any that exceed the cap in LEO shells
        for launch in env.pending_launches:
            target_altitude = launch.get("target_semi_major_axis_km", 0.0) - 6371.0
            if self.alt_min <= target_altitude <= self.alt_max:
                congested_launches += 1
                if congested_launches > self.max_launches:
                    canceled_ids.append(launch["id"])

        return EnvironmentMutation(canceled_launch_ids=canceled_ids)

# 3. Post-Mission Disposal (PMD) Deorbit Policy
class DeorbitPolicy(BasePolicy):
    def __init__(self, active_lifetime_years: float, compliance_rate: float = 0.9):
        self.active_lifetime_years = active_lifetime_years
        self.compliance_rate = compliance_rate

    def evaluate(self, env: OrbitalEnvironment, context: Optional[Dict[str, Any]] = None) -> EnvironmentMutation:
        modifications = {}
        
        for obj_id, obj in env.objects.items():
            if obj.object_type == "SATELLITE" and obj.operational_status == "ACTIVE":
                age_years = (env.epoch - obj.launch_date).days / 365.25
                if age_years > self.active_lifetime_years:
                    # Deterministic compliance based on ID hash to simulate compliance_rate
                    # (this ensures compliance checks are stable across time steps)
                    compliance_hash = hash(obj_id) % 100 / 100.0
                    if compliance_hash <= self.compliance_rate:
                        modifications[obj_id] = {
                            "operational_status": "INACTIVE",
                            "name": f"{obj.name} (DECOMMISSIONED)"
                        }

        return EnvironmentMutation(modify_object_states=modifications)

# 4. Traffic Management & Evasion Policy
class TrafficManagementPolicy(BasePolicy):
    def __init__(self, probability_threshold: float = 1e-4, delta_v_burn_m_s: float = 5.0):
        self.prob_threshold = probability_threshold
        self.delta_v_burn = delta_v_burn_m_s

    def evaluate(self, env: OrbitalEnvironment, context: Optional[Dict[str, Any]] = None) -> EnvironmentMutation:
        """
        Evaluate active conjunction events. If collision probability exceeds the threshold,
        and the satellite has enough delta-v, trigger an evasion maneuver.
        """
        modifications = {}
        conjunctions = context.get("conjunctions", []) if context else []
        
        for event in conjunctions:
            prob = event.get("collision_probability", 0.0)
            if prob >= self.prob_threshold:
                # Identify if one of the objects is an active player/operational satellite
                for obj_id in [event.get("object_1_id"), event.get("object_2_id")]:
                    if obj_id in env.objects:
                        obj = env.objects[obj_id]
                        if obj.object_type == "SATELLITE" and obj.operational_status == "ACTIVE":
                            if obj.fuel_delta_v_m_s >= self.delta_v_burn:
                                # Apply evasion burn: modify velocity vector and decrement delta-v budget
                                new_vel = [
                                    v + (self.delta_v_burn / 1000.0)  # simple velocity offset in km/s
                                    for v in obj.velocity
                                ]
                                modifications[obj_id] = {
                                    "velocity": new_vel,
                                    "fuel_delta_v_m_s": obj.fuel_delta_v_m_s - self.delta_v_burn
                                }
                                # Trigger maneuver for one satellite is sufficient
                                break
                                
        return EnvironmentMutation(modify_object_states=modifications)
