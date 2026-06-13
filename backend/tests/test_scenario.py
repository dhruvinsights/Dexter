import pytest
from datetime import datetime, timedelta, timezone
import numpy as np

from backend.shared.policy.rules import SimulationObject, OrbitalEnvironment, ADRPolicy, LaunchCapPolicy
from backend.shared.scenario.engine import ScenarioConfig, ScenarioRunner

@pytest.fixture
def initial_environment():
    """Returns a basic environment with satellites and debris to seed scenarios."""
    now = datetime(2026, 6, 14, 12, 0, 0, tzinfo=timezone.utc)
    
    sat1 = SimulationObject(
        id="sat-1",
        name="Active Satellite A",
        object_type="SATELLITE",
        position=[6871.0, 0.0, 0.0],
        velocity=[0.0, 7.61, 0.0],
        mass_kg=1500.0,
        cross_section_area=10.0,
        launch_date=now - timedelta(days=100),
        operational_status="ACTIVE",
        inclination_deg=45.0,
        semi_major_axis_km=6871.0
    )
    
    sat2 = SimulationObject(
        id="sat-2",
        name="Active Satellite B",
        object_type="SATELLITE",
        position=[6971.0, 0.0, 0.0],
        velocity=[0.0, 7.56, 0.0],
        mass_kg=1200.0,
        cross_section_area=8.0,
        launch_date=now - timedelta(days=200),
        operational_status="ACTIVE",
        inclination_deg=51.6,
        semi_major_axis_km=6971.0
    )

    deb1 = SimulationObject(
        id="deb-1",
        name="Rocket Body Fragment",
        object_type="DEBRIS",
        position=[7171.0, 0.0, 0.0],
        velocity=[0.0, 7.45, 0.0],
        mass_kg=200.0,
        cross_section_area=4.0,
        launch_date=now - timedelta(days=1000),
        operational_status="INACTIVE",
        inclination_deg=71.0,
        semi_major_axis_km=7171.0
    )

    return OrbitalEnvironment(
        epoch=now,
        objects={sat1.id: sat1, sat2.id: sat2, deb1.id: deb1},
        pending_launches=[]
    )

def test_baseline_scenario_run(initial_environment):
    """Test that a basic baseline scenario runs over a timeline and registers metrics."""
    config = ScenarioConfig(
        name="Baseline LEO Scenario",
        duration_days=5,
        time_step_hours=24,
        collision_threshold_km=0.1
    )
    
    runner = ScenarioRunner(config, initial_environment)
    result = runner.run()
    
    # 5 days / 24 hour steps = 5 steps. History should have 6 metrics (1 initial + 5 steps)
    assert result.scenario_name == "Baseline LEO Scenario"
    assert len(result.metrics_history) == 6
    assert result.final_metrics["collision_events"] == 0.0
    assert result.final_metrics["sustainability_score"] > 0.0

import random

def test_collision_and_breakup(initial_environment):
    """Test that two space objects close to each other trigger a collision and break up."""
    # Place two high-mass objects directly on top of each other to guarantee collision
    collision_env = initial_environment.model_copy(deep=True)
    
    collision_env.objects["sat-1"].position = [6800.0, 0.0, 0.0]
    collision_env.objects["sat-1"].velocity = [0.0, 7.6, 0.0]
    
    collision_env.objects["sat-2"].position = [6800.001, 0.0, 0.0] # 1 meter away
    collision_env.objects["sat-2"].velocity = [0.0, -7.6, 0.0] # Opposing velocity vectors
    
    # Run a short scenario (1 day, 1-hour step)
    config = ScenarioConfig(
        name="Catastrophic Breakup Scenario",
        duration_days=1,
        time_step_hours=1,
        collision_threshold_km=0.5
    )
    
    random.seed(0)
    runner = ScenarioRunner(config, collision_env)
    result = runner.run()
    
    # A collision must be registered
    assert result.final_metrics["collision_events"] >= 1.0
    # Sat-1 and Sat-2 must be destroyed (removed from final active elements list)
    assert "sat-1" not in result.final_environment.objects
    assert "sat-2" not in result.final_environment.objects
    # New fragments should have populated the debris catalog
    debris_list = result.final_environment.get_by_type("DEBRIS")
    assert len(debris_list) > 1

def test_comparative_policy_run(initial_environment):
    """Test that active policy sandbox runs produce different outcomes than baseline."""
    # Seed a baseline run
    baseline_config = ScenarioConfig(
        name="Baseline Case",
        duration_days=5,
        time_step_hours=24
    )
    baseline_runner = ScenarioRunner(baseline_config, initial_environment)
    baseline_res = baseline_runner.run()
    
    # Seed a policy run applying Active Debris Removal (ADR)
    # The initial environment has 1 debris piece (deb-1)
    adr_policy = ADRPolicy(removal_rate_per_year=1, target_metric="mass")
    policy_config = ScenarioConfig(
        name="ADR Active Case",
        duration_days=5,
        time_step_hours=24,
        active_policies=[adr_policy]
    )
    policy_runner = ScenarioRunner(policy_config, initial_environment)
    policy_res = policy_runner.run()
    
    # Under ADR, the debris 'deb-1' should be removed in the first step
    assert "deb-1" not in policy_res.final_environment.objects
    assert policy_res.final_metrics["final_debris_count"] == 0.0
    # In the baseline, it should remain active
    assert "deb-1" in baseline_res.final_environment.objects
    assert baseline_res.final_metrics["final_debris_count"] == 1.0
