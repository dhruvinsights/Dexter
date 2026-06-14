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


@app.get("/")
def root():
    return {"service": "dexter-ai", "status": "ok", "docs": "/docs"}
