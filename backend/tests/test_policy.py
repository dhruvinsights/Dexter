import pytest
from datetime import datetime, timedelta, timezone
from backend.shared.policy.rules import (
    SimulationObject,
    OrbitalEnvironment,
    ADRPolicy,
    LaunchCapPolicy,
    DeorbitPolicy,
    TrafficManagementPolicy
)

@pytest.fixture
def base_environment():
    """Returns an OrbitalEnvironment template with mock satellites and debris."""
    now = datetime(2026, 6, 14, 12, 0, 0, tzinfo=timezone.utc)
    
    sat1 = SimulationObject(
        id="sat-active-1",
        name="Sentinel 1A",
        object_type="SATELLITE",
        position=[6771.0, 0.0, 0.0],
        velocity=[0.0, 7.67, 0.0],
        mass_kg=2000.0,
        cross_section_area=15.0,
        launch_date=now - timedelta(days=365), # 1 year old
        operational_status="ACTIVE",
        fuel_delta_v_m_s=200.0,
        inclination_deg=51.6,
        semi_major_axis_km=6771.0
    )
    
    sat2 = SimulationObject(
        id="sat-old-2",
        name="Explorer 1",
        object_type="SATELLITE",
        position=[6780.0, 10.0, 0.0],
        velocity=[0.0, 7.66, 0.0],
        mass_kg=1500.0,
        cross_section_area=10.0,
        launch_date=now - timedelta(days=365 * 10), # 10 years old
        operational_status="ACTIVE",
        fuel_delta_v_m_s=50.0,
        inclination_deg=51.6,
        semi_major_axis_km=6780.0
    )

    deb1 = SimulationObject(
        id="debris-light-1",
        name="Fengyun Debris A",
        object_type="DEBRIS",
        position=[6800.0, 0.0, 0.0],
        velocity=[0.0, 7.65, 0.0],
        mass_kg=5.0, # Light
        cross_section_area=0.2,
        launch_date=now - timedelta(days=365 * 5),
        operational_status="INACTIVE",
        fuel_delta_v_m_s=0.0,
        inclination_deg=98.0,
        semi_major_axis_km=6800.0
    )

    deb2 = SimulationObject(
        id="debris-heavy-2",
        name="Zenit Rocket Stage",
        object_type="DEBRIS",
        position=[6900.0, 0.0, 0.0],
        velocity=[0.0, 7.55, 0.0],
        mass_kg=9000.0, # Very heavy
        cross_section_area=40.0,
        launch_date=now - timedelta(days=365 * 12),
        operational_status="INACTIVE",
        fuel_delta_v_m_s=0.0,
        inclination_deg=71.0,
        semi_major_axis_km=6900.0
    )

    env = OrbitalEnvironment(
        epoch=now,
        objects={
            sat1.id: sat1,
            sat2.id: sat2,
            deb1.id: deb1,
            deb2.id: deb2
        },
        pending_launches=[
            {
                "id": "launch-starlink-1",
                "name": "Starlink L15",
                "target_semi_major_axis_km": 6371.0 + 550.0 # LEO altitude 550 km
            },
            {
                "id": "launch-starlink-2",
                "name": "Starlink L16",
                "target_semi_major_axis_km": 6371.0 + 600.0 # LEO altitude 600 km
            }
        ]
    )
    return env

def test_adr_policy(base_environment):
    """Test that ADRPolicy targets the heaviest debris objects for removal."""
    # We want to remove 1 debris stage. It should target the Zenit Rocket stage (9000 kg)
    policy = ADRPolicy(removal_rate_per_year=1, target_metric="mass")
    mutation = policy.evaluate(base_environment)
    
    assert len(mutation.remove_object_ids) == 1
    assert "debris_heavy_2" in [d.replace("-", "_") for d in mutation.remove_object_ids]
    assert "debris-light-1" not in mutation.remove_object_ids

def test_launch_cap_policy(base_environment):
    """Test that LaunchCapPolicy cancels launches exceeding limits in alt shells."""
    # Max LEO launches = 1, should cancel the second one in the shell
    policy = LaunchCapPolicy(max_launches_per_year=1, altitude_range_km=(500.0, 800.0))
    mutation = policy.evaluate(base_environment)
    
    assert len(mutation.canceled_launch_ids) == 1
    assert mutation.canceled_launch_ids[0] == "launch-starlink-2"

def test_deorbit_policy(base_environment):
    """Test that DeorbitPolicy decommissions active satellites exceeding operational lifespan."""
    # Active lifetime limit = 5 years, compliance = 1.0 (always comply)
    policy = DeorbitPolicy(active_lifetime_years=5.0, compliance_rate=1.0)
    mutation = policy.evaluate(base_environment)
    
    # explorer 1 (sat-old-2) is 10 years old, should be decommissioned
    # sentinel 1A (sat-active-1) is 1 year old, should NOT be modified
    assert "sat-old-2" in mutation.modify_object_states
    assert "sat-active-1" not in mutation.modify_object_states
    assert mutation.modify_object_states["sat-old-2"]["operational_status"] == "INACTIVE"

def test_traffic_management_evasion(base_environment):
    """Test that TrafficManagementPolicy triggers delta-v evasion maneuvers for conjunction threats."""
    conjunction_context = {
        "conjunctions": [
            {
                "object_1_id": "sat-active-1",
                "object_2_id": "debris-light-1",
                "collision_probability": 5e-4 # Above threshold 1e-4
            }
        ]
    }
    
    policy = TrafficManagementPolicy(probability_threshold=1e-4, delta_v_burn_m_s=5.0)
    mutation = policy.evaluate(base_environment, context=conjunction_context)
    
    # Evasion should be triggered for sat-active-1 (fuel decremented and velocity altered)
    assert "sat-active-1" in mutation.modify_object_states
    mod = mutation.modify_object_states["sat-active-1"]
    
    assert mod["fuel_delta_v_m_s"] == 195.0 # 200 - 5
    assert len(mod["velocity"]) == 3
    # Check that velocity changed
    assert mod["velocity"] != base_environment.objects["sat-active-1"].velocity
