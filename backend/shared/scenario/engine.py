from datetime import datetime, timedelta, timezone
import math
import random
from typing import List, Dict, Any, Tuple
import numpy as np
from pydantic import BaseModel, Field

from backend.shared.policy.rules import OrbitalEnvironment, SimulationObject, BasePolicy, EnvironmentMutation
from backend.shared.physics.kepler import propagate_kepler, orbital_elements_to_cartesian

# Constants
MU = 398600.4418  # km^3/s^2
EARTH_RADIUS = 6371.0  # km

class ScenarioConfig(BaseModel):
    model_config = {"arbitrary_types_allowed": True}

    name: str
    duration_days: int = Field(default=30)
    time_step_hours: int = Field(default=24)
    collision_threshold_km: float = Field(default=0.05, description="Distance threshold to trigger a fragmentation check (50m)")
    active_policies: List[BasePolicy] = Field(default_factory=list)

class TimeSeriesMetric(BaseModel):
    epoch: datetime
    debris_count: int
    active_satellite_count: int
    cumulative_collisions: int
    congestion_index: float
    satellite_survivability: float
    sustainability_score: float

class ScenarioRunResult(BaseModel):
    scenario_name: str
    run_timestamp: datetime
    metrics_history: List[TimeSeriesMetric]
    final_metrics: Dict[str, float]
    final_environment: OrbitalEnvironment

class ScenarioRunner:
    def __init__(self, config: ScenarioConfig, initial_env: OrbitalEnvironment):
        self.config = config
        # Deep copy environment using model copy
        self.env = initial_env.model_copy(deep=True)
        self.cumulative_collisions = 0
        self.metrics_history: List[TimeSeriesMetric] = []

    def compute_metrics(self) -> TimeSeriesMetric:
        """
        Calculates sustainability and congestion metrics for the current environment epoch.
        """
        total_satellites = len([o for o in self.env.objects.values() if o.object_type == "SATELLITE"])
        active_satellites = len([o for o in self.env.objects.values() if o.object_type == "SATELLITE" and o.operational_status == "ACTIVE"])
        debris_count = len(self.env.get_by_type("DEBRIS"))
        
        # Calculate Congestion Index (ratio of objects in critical LEO band 600km to 1000km)
        congested_objects = 0
        for obj in self.env.objects.values():
            altitude = obj.semi_major_axis_km - EARTH_RADIUS
            if 600.0 <= altitude <= 1000.0:
                congested_objects += 1
        
        total_objects = len(self.env.objects)
        congestion_index = congested_objects / total_objects if total_objects > 0 else 0.0
        
        # Calculate Satellite Survivability (fraction of initial active satellites remaining active)
        initial_active = max(1.0, len([o for o in self.env.objects.values() if o.object_type == "SATELLITE"]))
        survivability = active_satellites / initial_active
        
        # Calculate Sustainability Score (0 - 100)
        # Higher score = safer, more sustainable environment
        collision_factor = math.exp(-self.cumulative_collisions / 5.0)
        sustainability_score = 100.0 * (
            0.4 * survivability + 
            0.3 * (1.0 - congestion_index) + 
            0.3 * collision_factor
        )
        
        return TimeSeriesMetric(
            epoch=self.env.epoch,
            debris_count=debris_count,
            active_satellite_count=active_satellites,
            cumulative_collisions=self.cumulative_collisions,
            congestion_index=congestion_index,
            satellite_survivability=survivability,
            sustainability_score=sustainability_score
        )

    def check_collisions_and_fragment(self) -> List[SimulationObject]:
        """
        Calculates close approaches and simulates fragmentation cascades (NASA Standard Breakup Model)
        when objects collide.
        """
        new_fragments: List[SimulationObject] = []
        collided_ids = set()
        
        objects_list = list(self.env.objects.values())
        n = len(objects_list)
        
        for i in range(n):
            obj1 = objects_list[i]
            if obj1.id in collided_ids:
                continue
                
            for j in range(i + 1, n):
                obj2 = objects_list[j]
                if obj2.id in collided_ids:
                    continue
                
                # Check 3D Euclidean distance in ECI Cartesian frame
                pos1 = np.array(obj1.position)
                pos2 = np.array(obj2.position)
                dist = np.linalg.norm(pos1 - pos2)
                
                # Proximity check
                combined_radius_km = (obj1.cross_section_area**0.5 + obj2.cross_section_area**0.5) / 1000.0
                if dist <= (combined_radius_km + self.config.collision_threshold_km):
                    # Trigger collision probability check
                    # Foster 2D simplified approach: probability based on miss distance
                    prob = math.exp(-dist / (combined_radius_km + 1e-6))
                    
                    # Monte Carlo draw to determine if a collision occurred
                    if random.random() < prob:
                        self.cumulative_collisions += 1
                        collided_ids.add(obj1.id)
                        collided_ids.add(obj2.id)
                        
                        # Generate fragmentation debris (NASA Standard Breakup Model)
                        fragments = self.generate_nasa_breakup_fragments(obj1, obj2)
                        new_fragments.extend(fragments)
                        break  # obj1 is destroyed, stop checking pairs
                        
        # Remove collided objects from active environment
        for oid in collided_ids:
            del self.env.objects[oid]
            
        return new_fragments

    def generate_nasa_breakup_fragments(self, obj1: SimulationObject, obj2: SimulationObject) -> List[SimulationObject]:
        """
        Simulates fragment creation using standard NASA Breakup rules:
        Number of fragments N(Lc) = 29.85 * M^0.75 * Lc^-1.71.
        """
        fragments: List[SimulationObject] = []
        total_mass = obj1.mass_kg + obj2.mass_kg
        
        # Calculate center of mass position and velocity
        pos_com = (np.array(obj1.position) * obj1.mass_kg + np.array(obj2.position) * obj2.mass_kg) / total_mass
        vel_com = (np.array(obj1.velocity) * obj1.mass_kg + np.array(obj2.velocity) * obj2.mass_kg) / total_mass
        
        # We model fragments larger than Lc = 10 cm (0.1 meters) for computational stability
        Lc = 0.1
        num_fragments = int(29.85 * (total_mass ** 0.75) * (Lc ** -1.71))
        # Cap fragments in prototype for compute stability
        num_fragments = min(num_fragments, 50)
        
        for k in range(num_fragments):
            # 1. Delta-velocity perturbation vector (log-normal speed, random direction)
            # Typical relative impact velocity in LEO is ~10-15 km/s, resulting in delta-v of 0.1 - 2 km/s
            dv_speed_m_s = random.lognormvariate(2.0, 1.0) # meters/sec
            dv_speed_km_s = dv_speed_m_s / 1000.0
            
            # Spherical coordinate random distribution
            theta = random.uniform(0, 2.0 * math.pi)
            phi = random.uniform(0, math.pi)
            dv_vector = np.array([
                math.sin(phi) * math.cos(theta) * dv_speed_km_s,
                math.sin(phi) * math.sin(theta) * dv_speed_km_s,
                math.cos(phi) * dv_speed_km_s
            ])
            
            frag_vel = vel_com + dv_vector
            
            # Position offset spread slightly from collision point
            offset = np.array([random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-1, 1)]) * 0.1
            frag_pos = pos_com + offset
            
            # Log-normal mass distribution for fragment pieces
            frag_mass = total_mass * (random.uniform(0.0001, 0.002))
            frag_area = 0.01 + random.uniform(0.01, 0.1)
            
            # Derive Keplerian orbital elements from new Cartesian states
            r_val = np.linalg.norm(frag_pos)
            v_val = np.linalg.norm(frag_vel)
            h_vector = np.cross(frag_pos, frag_vel)
            h_val = np.linalg.norm(h_vector)
            
            # Inclination
            incl = math.degrees(math.acos(min(1.0, max(-1.0, h_vector[2] / h_val))))
            # Semi-major axis (1/a = 2/r - v^2/mu)
            inv_a = (2.0 / r_val) - (v_val ** 2 / (MU / 1e9)) # MU is in m^3/s^2, convert to km^3/s^2
            a = abs(1.0 / inv_a) if abs(inv_a) > 1e-12 else r_val
            if a < EARTH_RADIUS:
                a = obj1.semi_major_axis_km
            
            frag = SimulationObject(
                id=f"fragment-{obj1.id[:5]}-{obj2.id[:5]}-{k}",
                name=f"Debris Piece {k}",
                object_type="DEBRIS",
                position=frag_pos.tolist(),
                velocity=frag_vel.tolist(),
                mass_kg=frag_mass,
                cross_section_area=frag_area,
                launch_date=self.env.epoch,
                operational_status="INACTIVE",
                fuel_delta_v_m_s=0.0,
                inclination_deg=incl,
                semi_major_axis_km=a
            )
            fragments.append(frag)
            
        return fragments

    def run(self) -> ScenarioRunResult:
        """
        Executes the time-step scenario propagation loop, applying active policies
        and computing metrics.
        """
        dt_seconds = self.config.time_step_hours * 3600.0
        steps = int(self.config.duration_days * 24 / self.config.time_step_hours)
        
        # Calculate initial metrics
        self.metrics_history.append(self.compute_metrics())
        
        for _ in range(steps):
            # 1. Handle conjunction alerts and trigger breakups (based on current positions)
            fragments = self.check_collisions_and_fragment()
            for frag in fragments:
                self.env.objects[frag.id] = frag

            # 2. Evaluate Policy Rules & Apply Mutations (before state updates)
            context = {"conjunctions": []}
            # Look for active close approaches for TrafficManagementPolicy
            objects_list = list(self.env.objects.values())
            for i in range(len(objects_list)):
                p1 = objects_list[i]
                for j in range(i+1, len(objects_list)):
                    p2 = objects_list[j]
                    dist = np.linalg.norm(np.array(p1.position) - np.array(p2.position))
                    if dist < 2.0: # Close approach within 2km
                        context["conjunctions"].append({
                            "object_1_id": p1.id,
                            "object_2_id": p2.id,
                            "collision_probability": min(1.0, 1.0 / (dist**2 + 1e-3))
                        })

            for policy in self.config.active_policies:
                mutation = policy.evaluate(self.env, context=context)
                
                # Apply mutations: removals
                for oid in mutation.remove_object_ids:
                    if oid in self.env.objects:
                        del self.env.objects[oid]
                        
                # Apply mutations: modifications
                for oid, state_diff in mutation.modify_object_states.items():
                    if oid in self.env.objects:
                        obj = self.env.objects[oid]
                        for key, val in state_diff.items():
                            setattr(obj, key, val)
                            
                # Apply mutations: launch cancellations
                if mutation.canceled_launch_ids:
                    self.env.pending_launches = [
                        l for l in self.env.pending_launches 
                        if l["id"] not in mutation.canceled_launch_ids
                    ]

            # 3. Propagate environment time
            self.env.epoch += timedelta(hours=self.config.time_step_hours)
            
            # 4. Advance positions of all objects using Kepler propagation
            for obj_id, obj in list(self.env.objects.items()):
                # Propagate position vector rotation in orbital plane
                a_m = obj.semi_major_axis_km * 1000.0
                n_rad_sec = math.sqrt(MU / (a_m * a_m * a_m))
                
                pos = np.array(obj.position)
                vel = np.array(obj.velocity)
                h = np.cross(pos, vel)
                h_norm = h / np.linalg.norm(h)
                
                theta = n_rad_sec * dt_seconds
                cos_t = math.cos(theta)
                sin_t = math.sin(theta)
                
                # Rodrigues' rotation formula
                pos_new = pos * cos_t + np.cross(h_norm, pos) * sin_t + h_norm * np.dot(h_norm, pos) * (1 - cos_t)
                vel_new = vel * cos_t + np.cross(h_norm, vel) * sin_t + h_norm * np.dot(h_norm, vel) * (1 - cos_t)
                
                obj.position = pos_new.tolist()
                obj.velocity = vel_new.tolist()
            
            # 5. Record time-series metrics
            self.metrics_history.append(self.compute_metrics())
            
        # Compile final scores
        final_metric = self.metrics_history[-1]
        final_summary = {
            "sustainability_score": final_metric.sustainability_score,
            "congestion_index": final_metric.congestion_index,
            "collision_events": float(self.cumulative_collisions),
            "remaining_active_satellites": float(final_metric.active_satellite_count),
            "final_debris_count": float(final_metric.debris_count)
        }
        
        return ScenarioRunResult(
            scenario_name=self.config.name,
            run_timestamp=datetime.now(timezone.utc) if hasattr(timezone, 'utc') else datetime.utcnow(),
            metrics_history=self.metrics_history,
            final_metrics=final_summary,
            final_environment=self.env
        )
