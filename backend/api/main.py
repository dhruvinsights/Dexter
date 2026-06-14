"""
Dexter AI backend — FastAPI application entry point.

Run:
    cd backend
    uvicorn api.main:app --reload --port 8000
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import ai

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Dexter AI Backend",
    description="Orbital sustainability AI agents, RAG, and analysis API.",
    version="0.1.0",
)

# Allow the Vite dev server (and any local origin) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai.router)

logger = logging.getLogger(__name__)


@app.on_event("startup")
def bootstrap_rag() -> None:
    """Provision + seed the RAG knowledge base on startup (best-effort)."""
    try:
        from config.db2_connection import get_db_connection
        from ai.rag_seed import ensure_policy_documents

        db = get_db_connection()
        ensure_policy_documents(db)
    except Exception as e:  # noqa: BLE001 — never block startup on the DB
        logger.warning(f"RAG bootstrap skipped (DB unavailable?): {e}")


@app.get("/")
def root():
    return {"service": "dexter-ai", "status": "ok", "docs": "/docs"}
