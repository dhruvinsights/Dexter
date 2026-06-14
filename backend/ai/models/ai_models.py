"""
Pydantic models for the AI analysis service. Shared by the FastAPI router,
the analysis service, and the agents.
"""
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class AnalysisType(str, Enum):
    RISK_ASSESSMENT = "risk_assessment"
    RECOMMENDATION = "recommendation"
    SUSTAINABILITY_ANALYSIS = "sustainability_analysis"
    EXECUTIVE_SUMMARY = "executive_summary"


class AnalysisRequest(BaseModel):
    analysis_type: AnalysisType
    metrics: dict[str, Any] = Field(default_factory=dict)
    scenario_name: Optional[str] = None
    baseline_metrics: Optional[dict[str, Any]] = None
    comparison: Optional[dict[str, Any]] = None


class AnalysisResponse(BaseModel):
    analysis_type: AnalysisType
    content: str
    scenario_id: Optional[str] = None
    model_used: Optional[str] = None
    generated_at: Optional[str] = None
    latency_seconds: Optional[float] = None


class AgentHealthCheck(BaseModel):
    status: str
    llm_available: bool
    embedding_available: bool
    db_available: bool
    model_name: str
    embedding_model: str
    timestamp: str
