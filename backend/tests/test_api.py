import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from unittest.mock import patch

from backend.services.physics.app.main import app

@pytest.fixture
def client():
    """Provides a thread-safe TestClient instance for each API test, cleanly tearing it down after execution."""
    with TestClient(app) as c:
        yield c

# Known valid TLE set for ISS (ZARYA)
ISS_LINE1 = "1 25544U 98067A   26164.55160867  .00016717  00000-0  30225-3 0  9015"
ISS_LINE2 = "2 25544  51.6418 190.2312 0005312  89.2612 270.8912 15.49812401 54125"

def test_read_root(client):
    """Verify that the API root endpoint is operational."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "CORE_ENGINE_APIS_OPERATIONAL"}

def test_propagate_kepler_api(client):
    """Verify Kepler propagation endpoint."""
    payload = {
        "a_km": 7000.0,
        "e": 0.001,
        "i_deg": 45.0,
        "Omega_deg": 120.0,
        "omega_deg": 45.0,
        "nu_deg": 0.0,
        "time_seconds": 3600.0
    }
    response = client.post("/api/v1/physics/propagate/kepler", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "a_km" in data
    assert "cartesian" in data
    assert "position" in data["cartesian"]
    assert "velocity" in data["cartesian"]
    assert len(data["cartesian"]["position"]) == 3
    assert len(data["cartesian"]["velocity"]) == 3

def test_propagate_tle_api(client):
    """Verify TLE propagation endpoint using SGP4."""
    payload = {
        "line1": ISS_LINE1,
        "line2": ISS_LINE2,
        "target_time": "2026-06-15T12:00:00"
    }
    response = client.post("/api/v1/physics/propagate/tle", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["norad_id"] == 25544
    assert len(data["position"]) == 3
    assert len(data["velocity"]) == 3

def test_conjunction_check_api(client):
    """Verify conjunction search / spatial proximity API."""
    payload = {
        "particles": [
            {"id": "obj-1", "position": [6800.0, 0.0, 0.0], "radius_m": 5.0},
            {"id": "obj-2", "position": [6800.002, 0.0, 0.0], "radius_m": 5.0} # 2 meters away
        ],
        "threshold_m": 100.0
    }
    response = client.post("/api/v1/physics/conjunctions/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["object_1_id"] == "obj-1"
    assert data[0]["object_2_id"] == "obj-2"
    assert data[0]["miss_distance_m"] == 0.0 # because combined radius is 10m, which is greater than 2m distance

def test_scenario_run_api(client):
    """Verify scenario execution endpoint with active policies."""
    payload = {
        "name": "API Active Test",
        "duration_days": 2,
        "time_step_hours": 24,
        "policies": [
            {
                "policy_type": "LAUNCH_CAP",
                "parameters": {"max_launches_per_year": 10, "altitude_range_km": [500.0, 1200.0]}
            }
        ],
        "initial_objects": [
            {
                "id": "sat-a",
                "name": "Sat A",
                "object_type": "SATELLITE",
                "position": [6871.0, 0.0, 0.0],
                "velocity": [0.0, 7.61, 0.0],
                "mass_kg": 1000.0,
                "cross_section_area": 5.0,
                "launch_date": "2026-06-14T12:00:00Z",
                "operational_status": "ACTIVE",
                "inclination_deg": 45.0,
                "semi_major_axis_km": 6871.0
            }
        ]
    }
    response = client.post("/api/v1/scenarios/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["scenario_name"] == "API Active Test"
    assert "final_metrics" in data
    assert "metrics_history" in data
    assert len(data["metrics_history"]) == 3 # 1 initial + 2 steps (2 days, 24 hr step)

def test_scenario_compare_api(client):
    """Verify scenario comparison endpoint."""
    payload = {
        "name": "ADR Policy Case",
        "duration_days": 1,
        "time_step_hours": 24,
        "policies": [
            {
                "policy_type": "ADR",
                "parameters": {"removal_rate_per_year": 5, "target_metric": "mass"}
            }
        ],
        "initial_objects": [
            {
                "id": "sat-a",
                "name": "Sat A",
                "object_type": "SATELLITE",
                "position": [6871.0, 0.0, 0.0],
                "velocity": [0.0, 7.61, 0.0],
                "mass_kg": 1000.0,
                "cross_section_area": 5.0,
                "launch_date": "2026-06-14T12:00:00Z",
                "operational_status": "ACTIVE",
                "inclination_deg": 45.0,
                "semi_major_axis_km": 6871.0
            }
        ]
    }
    response = client.post("/api/v1/scenarios/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "baseline_metrics" in data
    assert "comparison_summaries" in data
    assert "ADR Policy Case" in data["comparison_summaries"]

@patch("backend.services.catalog.app.core.celestrak.fetch_celestrak_tles")
def test_fetch_catalog_group_api(mock_fetch, client):
    """Verify that catalog fetching routes parse fetched TLE lists correctly."""
    mock_tle_text = (
        "ISS (ZARYA)\n"
        "1 25544U 98067A   26164.55160867  .00016717  00000-0  30225-3 0  9015\n"
        "2 25544  51.6418 190.2312 0005312  89.2612 270.8912 15.49812401 54125\n"
    )
    mock_fetch.return_value = mock_tle_text
    
    response = client.get("/api/v1/catalog/fetch/active")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "ISS (ZARYA)"
    assert data[0]["norad_id"] == 25544
    assert data[0]["inclination_deg"] == 51.6418

def test_simulation_stream_ws(client):
    """Verify WebSocket state-vector streaming connection."""
    with client.websocket_connect("/api/v1/simulation/stream") as websocket:
        # Send speed multiplier config
        websocket.send_json({"group": "active", "speed_multiplier": 5.0})
        # Receive first stream frame
        data = websocket.receive_json()
        assert "epoch" in data
        assert "states" in data
        assert isinstance(data["states"], list)
        # We seeded objects, so we should get simulated states back
        assert len(data["states"]) > 0
        assert "id" in data["states"][0]
        assert "position" in data["states"][0]
        assert len(data["states"][0]["position"]) == 3
        websocket.close()
