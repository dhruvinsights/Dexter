# Orbital Sentinel (Backend Engine)

Orbital Sentinel is a modular, high-fidelity space sustainability simulator and decision-support twin. It models Earth's orbital environment, predicts conjunction events, simulates catastrophic collision cascades using the NASA Standard Breakup Model, and allows users to evaluate the long-term impact of space debris mitigation policies.

This repository contains the backend physics engine, catalog databases, scenario runner, policy sandboxes, and WebSocket stream adapters.

---

## 🛠️ Architecture & Core Components

The backend is separated into discrete modular layers:
1.  **Physics Core (`backend/shared/physics/`)**: Provides Keplerian analytical solvers, coordinate translators (ECI Cartesian $\leftrightarrow$ orbital elements), and SGP4 TLE propagation wrappers.
2.  **Policy Engine (`backend/shared/policy/`)**: A decoupled layer containing rules (Active Deorbit ADR, Launch Caps, Deorbit Compliances, and Collision Avoidance Evasion) that mutate the orbital state.
3.  **Scenario Runner (`backend/shared/scenario/`)**: Steps the simulation forward in time, monitors conjunction threat alerts, generates fragmentations, and records time-series metrics.
4.  **Database Persistence (`backend/shared/models.py`, `database.py`)**: Persists catalogs, historic runs, state-vectors, and conjunction events.
5.  **API Gateway (`backend/services/physics/app/main.py`)**: Serves FastAPI REST routes for scenario management and exposes the WebSocket instanced stream adapter.

---

## 🚀 Getting Started

### 1. Installation
Clone the workspace and install python dependencies:
```bash
# Navigate to the backend directory
cd backend

# Install dependencies (ensure Python 3.12+ is active)
pip install -r requirements.txt
```

### 2. Seeding the Database Catalog
Orbital Sentinel caches TLE datasets locally to prevent rate limiting. Initialize your database schemas and fetch live active satellite orbital parameters from CelesTrak:
```bash
# From the workspace root (E:\dexter)
$env:PYTHONPATH="E:\dexter"
python backend/shared/seed.py
```
*This creates the database `backend/orbital_sentinel.db` and populates it with over 15,000 active satellite catalog entries.*

### 3. Running the REST/WS Server
Launch the FastAPI gateway service locally:
```bash
# Start Uvicorn developer server
uvicorn backend.services.physics.app.main:app --reload --port 8000
```
Open [http://localhost:8000/docs](http://localhost:8000/docs) in your browser to view the interactive Swagger documentation.

### 4. Running the Test Suite
Validate the physics math, policy rules, scenario cascades, and API gateways:
```bash
pytest -v
```

---

## 🖥️ Integration Guide: Frontend & 3D Visualization

The visualization layer (developed by the frontend team) coordinates with the backend service through two channels: **REST APIs** for setup and comparative charts, and a **WebSocket Stream** for real-time 3D rendering updates.

```
                  +----------------------------------+
                  |  Orbital Sentinel Frontend Client |
                  +----------------------------------+
                             /            \
             REST (Scenario Configs)    WebSockets (Real-time Positions)
                           /                \
                          v                  v
                  +---------------+    +-----------------------+
                  | API Gateway   |    | WebSocket Stream      |
                  | (Uvicorn:8000)|    | /api/v1/simulation/...|
                  +---------------+    +-----------------------+
```

### Channel A: Scenario Management (REST API)

Use REST requests to load, setup, and run analytical simulation timelines:

*   **Run Simulation (`POST /api/v1/scenarios/run`)**:
    *   **Goal**: Launches an orbital forecast sandbox.
    *   **Input**: Launch rates, initial satellite clusters, active policy configurations (e.g. caps, evasion burns).
    *   **Output**: Time-series metrics history (`debris_count`, `active_satellite_count`, `congestion_index`, `sustainability_score`).
*   **Compare Policies (`POST /api/v1/scenarios/compare`)**:
    *   **Goal**: Evaluates policy efficacy.
    *   **Output**: Compares final metrics of a baseline sandbox (no policies) and a policy-guided case side-by-side. Excellent for rendering comparative charts (e.g., Plotly, Recharts).

---

### Channel B: Real-Time WebGL Particle Streaming (WebSockets)

To render 15,000+ objects at 60 FPS in Three.js/WebGL, we avoid individual mesh draws. Instead, we write incoming coordinates directly into a single GPU instance matrix.

#### 1. Establish the Connection
Connect to the WebSocket path:
```
ws://localhost:8000/api/v1/simulation/stream
```

#### 2. Send Configuration
Upon connection, the frontend sends a setup JSON payload specifying the speed multiplier (how fast time moves) and target subset:
```json
{
  "group": "active",
  "speed_multiplier": 60.0
}
```

#### 3. Receive Frame Telemetry
The server begins streaming frames at 10 Hz containing ECI Cartesian coordinates (in kilometers) for active space objects:
```json
{
  "epoch": "2026-06-14T12:00:10+00:00",
  "states": [
    {
      "id": "c1f7b029-4e78-43db-b863-d3a39e8020e9",
      "name": "ISS (ZARYA)",
      "position": [4182.2543, -3912.4321, 3512.9862],
      "velocity": [-4.1203, -3.9862, -4.9213]
    },
    {
      "id": "e28080ff-4ea0-47de-8b2b-f119028080ee",
      "name": "HST",
      "position": [6210.1234, 1890.4321, -2100.9876],
      "velocity": [-1.9876, 5.1234, 4.9012]
    }
  ]
}
```

#### 4. Update the Three.js Canvas
The visualization team can capture this array and dynamically update a `THREE.InstancedMesh` representation.
*   **Physics frame translation**:
    ```javascript
    const position = new THREE.Vector3(state.position[0], state.position[1], state.position[2]);
    
    // Scale standard coordinates if rendering relative ratios (Earth Radius ~ 6371 km)
    const dummy = new THREE.Object3D();
    dummy.position.copy(position);
    dummy.updateMatrix();
    
    instancedMesh.setMatrixAt(index, dummy.matrix);
    ```
*   Once all positions are written, mark the instanced mesh structure to trigger a GPU re-draw:
    ```javascript
    instancedMesh.instanceMatrix.needsUpdate = true;
    ```
*   This pipeline keeps the browser render thread lag-free, since all heavy SGP4 mathematics are handled server-side on the backend.
