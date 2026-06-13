# Workstream 4 — FastAPI Backend: Server, Routing & Data Contracts

**Owner:** Person D  
**Estimated effort:** 5–6 hours  
**Parallel with:** WS1, WS2, WS3 (all produce to this API)  
**Depends on:** WS1 models, WS2 models, WS3 models (get schemas Day 1)  
**Outputs consumed by:** WS5 (AI Agent), WS6 (Frontend)

---

## Goal

Stand up the FastAPI application that serves as the single integration point for the entire system. Your job is the overall server structure, cross-cutting concerns (CORS, auth stub, error handling, logging, startup), and ensuring all routes are wired together cleanly.

WS1, WS2, and WS3 each write their own routers — you integrate them and own the server skeleton.

---

## Project Layout

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  ← you own this
│   ├── config.py                ← you own this
│   ├── dependencies.py          ← you own this
│   ├── data/                    ← WS1
│   ├── simulation/              ← WS2
│   ├── metrics/                 ← WS3
│   ├── ai/                      ← WS5
│   ├── reports/                 ← WS7
│   ├── models/                  ← shared, all workstreams contribute
│   └── routers/
│       ├── data.py              ← WS1
│       ├── simulation.py        ← WS2
│       ├── metrics.py           ← WS3
│       ├── ai.py                ← WS5
│       ├── reports.py           ← WS7
│       └── health.py            ← you own this
├── tests/
│   ├── test_health.py
│   └── test_integration.py
├── data/
│   ├── cache/                   ← auto-created
│   └── precomputed/             ← auto-created by WS2
├── requirements.txt
├── Dockerfile
└── .env.example
```

---

## What You Need to Build

### 4.1 Main Application Entry Point

**File:** `backend/app/main.py`

```python
# backend/app/main.py

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import logging
import time

from app.config import settings
from app.routers import health, data, simulation, metrics, ai, reports

# Set up structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger("orbital_sentinel")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("Starting Orbital Sentinel backend...")

    # Precompute scenarios at startup if not cached
    from app.simulation.precomputed import precompute_all_scenarios
    import asyncio
    asyncio.create_task(precompute_all_scenarios())

    logger.info("Backend ready.")
    yield

    logger.info("Shutting down Orbital Sentinel backend.")


app = FastAPI(
    title="Orbital Sentinel API",
    description="AI-powered orbital sustainability decision support platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# --- Middleware ---

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(f"{request.method} {request.url.path} → {response.status_code} ({duration_ms:.1f}ms)")
    return response


# --- Global Exception Handler ---

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )


# --- Routers ---

app.include_router(health.router)
app.include_router(data.router)
app.include_router(simulation.router)
app.include_router(metrics.router)
app.include_router(ai.router)
app.include_router(reports.router)
```

---

### 4.2 Configuration

**File:** `backend/app/config.py`

```python
# backend/app/config.py

from pydantic_settings import BaseSettings
from typing import list

class Settings(BaseSettings):
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # CORS — comma-separated origins in .env
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",    # Vite dev server
        "http://localhost:3000",
        "app://.",                  # Electron
    ]

    # AI
    IBM_WATSONX_API_KEY: str = ""
    IBM_WATSONX_PROJECT_ID: str = ""
    IBM_WATSONX_URL: str = "https://us-south.ml.cloud.ibm.com"
    OPENAI_API_KEY: str = ""        # fallback

    # Data paths
    PRECOMPUTED_DIR: str = "data/precomputed"
    CACHE_DIR: str = "data/cache"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
```

---

### 4.3 Health Check & Status Endpoints

**File:** `backend/app/routers/health.py`

```python
# backend/app/routers/health.py

from fastapi import APIRouter
from datetime import datetime
from pathlib import Path
from app.simulation.precomputed import list_precomputed

router = APIRouter(tags=["system"])

@router.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@router.get("/status")
async def system_status():
    """
    Detailed system status for the frontend status bar.
    Tells the UI what's ready.
    """
    precomputed = list_precomputed()
    cache_exists = Path("data/cache/tle_snapshot.json").exists()

    return {
        "api": "ready",
        "tle_cache": "ready" if cache_exists else "missing",
        "precomputed_scenarios": precomputed,
        "scenarios_ready": len(precomputed) >= 4,
        "timestamp": datetime.utcnow().isoformat(),
    }
```

---

### 4.4 Complete API Endpoint Map

This is the **contract** — all workstreams build to this spec. Do not change paths without updating the frontend.

```
GET  /health                              → System health
GET  /status                              → Detailed readiness status

GET  /api/data/orbital-state              → OrbitalStateSnapshot (WS1)
GET  /api/data/catalogue/stats            → Object count breakdown (WS1)

GET  /api/scenarios/                      → List[ScenarioConfig] (WS2)
GET  /api/scenarios/{id}/result           → RawMOCATOutput (WS2)
POST /api/scenarios/run                   → Start custom simulation (WS2)
GET  /api/scenarios/run/{run_id}/status   → Simulation run status (WS2)

GET  /api/metrics/{scenario_id}           → ScenarioMetrics (WS3)
GET  /api/metrics/{scenario_id}/score     → SustainabilityScore (WS3)
GET  /api/metrics/compare/all             → ComparisonResult (WS3)

POST /api/ai/analyze                      → AI analysis (WS5)
POST /api/ai/recommend                    → Policy recommendation (WS5)
POST /api/ai/summarize                    → Executive summary (WS5)
GET  /api/ai/stream/{scenario_id}         → SSE stream for AI response (WS5)

POST /api/reports/generate                → Generate PDF report (WS7)
GET  /api/reports/{report_id}/download    → Download generated PDF (WS7)
```

---

### 4.5 Requirements & Dockerfile

**File:** `backend/requirements.txt`

```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
pydantic>=2.7.0
pydantic-settings>=2.2.0
httpx>=0.27.0
numpy>=1.26.0
python-dotenv>=1.0.0

# AI
ibm-watsonx-ai>=1.0.0
openai>=1.30.0

# Reports
reportlab>=4.2.0
Pillow>=10.3.0

# Testing
pytest>=8.2.0
pytest-asyncio>=0.23.0
httpx   # also used for test client
```

**File:** `backend/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create data directories
RUN mkdir -p data/cache data/precomputed

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**File:** `backend/.env.example`

```env
DEBUG=false
ALLOWED_ORIGINS=http://localhost:5173,app://.

IBM_WATSONX_API_KEY=your_key_here
IBM_WATSONX_PROJECT_ID=your_project_id
IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com

OPENAI_API_KEY=your_openai_key_here
```

---

### 4.6 Integration Test

**File:** `backend/tests/test_integration.py`

```python
# backend/tests/test_integration.py

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

@pytest.mark.asyncio
async def test_scenarios_list():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/scenarios/")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 4
    ids = [s["scenario_id"] for s in data]
    assert "baseline_2024" in ids
    assert "hybrid_2024" in ids

@pytest.mark.asyncio
async def test_metrics_compare():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/metrics/compare/all")
    assert r.status_code == 200
    result = r.json()
    assert "winner" in result
    # Hybrid should not be last place
    assert result["ranked"][-1] != "hybrid_2024"
```

---

## Running the Server

```bash
# Development
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Visit docs at:
# http://localhost:8000/docs

# Run tests
pytest tests/ -v
```

---

## Definition of Done

- [ ] `GET /health` returns 200
- [ ] `GET /status` reports `scenarios_ready: true`
- [ ] All API routes registered and return correct HTTP status codes
- [ ] CORS configured — frontend at localhost:5173 can call the API
- [ ] Integration tests pass
- [ ] Dockerfile builds successfully
- [ ] `.env.example` committed (not `.env`)
- [ ] Auto-precomputation triggers on startup
