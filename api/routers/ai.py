"""
AI Analysis API Endpoints
FastAPI router for AI agent analysis capabilities
"""
import sys
import json
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from ai.analyst import run_analysis, get_analysis_service
from ai.models.ai_models import (
    AnalysisRequest,
    AnalysisResponse,
    AnalysisType,
    AgentHealthCheck
)
from ai.llm_client import get_llm_client
from ai.embeddings.ollama_client import get_embedding_client
from config.db2_connection import get_db_connection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalysisRequest):
    """
    Run AI analysis on scenario metrics
    
    Supports four analysis types:
    - risk_assessment: Analyze collision risks and orbital sustainability
    - recommendation: Compare scenarios and recommend best strategy
    - sustainability_analysis: Deep-dive into long-term trajectory
    - executive_summary: Generate boardroom-ready 3-paragraph summary
    
    Args:
        request: Analysis request with type and metrics
        
    Returns:
        Analysis response with generated content
    """
    try:
        logger.info(f"Received analysis request: {request.analysis_type}")
        response = await run_analysis(request)
        return response
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/stream/{scenario_id}")
async def stream_analysis(
    scenario_id: str,
    analysis_type: str = "risk_assessment"
):
    """
    Stream AI analysis tokens in real-time (Server-Sent Events)
    
    Used by frontend for typewriter effect display.
    
    Args:
        scenario_id: Scenario identifier
        analysis_type: Type of analysis (default: risk_assessment)
        
    Returns:
        SSE stream of tokens
    """
    try:
        # Validate analysis type
        try:
            analysis_enum = AnalysisType(analysis_type)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid analysis type: {analysis_type}"
            )
        
        # For demo purposes, create sample metrics
        # In production, fetch from database or simulation results
        sample_metrics = {
            'scenario_id': scenario_id,
            'collision_frequency': 12.5,
            'debris_growth_pct': 15.3,
            'survivability_pct': 87.2,
            'congestion_index': 95,
            'score': 78,
            'grade': 'B'
        }
        
        request = AnalysisRequest(
            analysis_type=analysis_enum,
            metrics=sample_metrics,
            scenario_name=scenario_id
        )
        
        service = get_analysis_service()
        
        async def generate():
            """Generate SSE stream"""
            try:
                async for token in service.stream_analysis(request):
                    yield f"data: {json.dumps({'token': token})}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                logger.error(f"Streaming error: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stream setup error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/quick-summary/{scenario_id}", response_model=AnalysisResponse)
async def quick_summary(scenario_id: str):
    """
    Generate quick executive summary for a scenario
    
    One-shot endpoint for dashboard AI summary panel.
    
    Args:
        scenario_id: Scenario identifier
        
    Returns:
        Executive summary analysis
    """
    try:
        # For demo purposes, create sample metrics
        # In production, fetch from database or simulation results
        sample_metrics = {
            'scenario_id': scenario_id,
            'collision_frequency': 12.5,
            'debris_growth_pct': 15.3,
            'survivability_pct': 87.2,
            'congestion_index': 95,
            'score': 78,
            'grade': 'B',
            'collision_reduction_pct': 35.2
        }
        
        request = AnalysisRequest(
            analysis_type=AnalysisType.EXECUTIVE_SUMMARY,
            metrics=sample_metrics,
            scenario_name=scenario_id.replace('_', ' ').title()
        )
        
        response = await run_analysis(request)
        return response
        
    except Exception as e:
        logger.error(f"Quick summary error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare", response_model=AnalysisResponse)
async def compare_scenarios(comparison_data: dict):
    """
    Compare multiple scenarios and generate recommendation
    
    Args:
        comparison_data: Dictionary with ranked scenarios and scores
        
    Returns:
        Policy recommendation analysis
    """
    try:
        # Validate comparison data structure
        required_fields = ['ranked', 'scores', 'winner', 'metrics']
        if not all(field in comparison_data for field in required_fields):
            raise HTTPException(
                status_code=400,
                detail=f"Missing required fields. Need: {required_fields}"
            )
        
        # Create analysis request
        request = AnalysisRequest(
            analysis_type=AnalysisType.RECOMMENDATION,
            metrics={},  # Not used for recommendations
            comparison=comparison_data
        )
        
        response = await run_analysis(request)
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Comparison error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", response_model=AgentHealthCheck)
async def health_check():
    """
    Check health of AI services
    
    Returns:
        Health status of LLM, embeddings, and database
    """
    try:
        llm = get_llm_client()
        embedding = get_embedding_client()
        
        # Check LLM
        llm_available = await llm.health_check()
        
        # Check embeddings
        embedding_available = await embedding.health_check()
        
        # Check database
        db_available = False
        try:
            db = get_db_connection()
            db_available = db.health_check()
        except Exception as e:
            logger.warning(f"Database health check failed: {e}")
        
        # Determine overall status
        if llm_available and embedding_available and db_available:
            status = "healthy"
        elif llm_available:
            status = "degraded"
        else:
            status = "unhealthy"
        
        return AgentHealthCheck(
            status=status,
            llm_available=llm_available,
            embedding_available=embedding_available,
            db_available=db_available,
            model_name=llm.model,
            embedding_model=embedding.embedding_model,
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Health check error: {e}", exc_info=True)
        return AgentHealthCheck(
            status="unhealthy",
            llm_available=False,
            embedding_available=False,
            db_available=False,
            model_name="unknown",
            embedding_model="unknown",
            timestamp=datetime.utcnow().isoformat()
        )


@router.get("/models")
async def list_models():
    """
    List available AI models
    
    Returns:
        Dictionary of available models and their status
    """
    try:
        llm = get_llm_client()
        
        return {
            "llm_model": llm.model,
            "llm_available": llm.check_model_availability(),
            "embedding_model": get_embedding_client().embedding_model,
            "embedding_available": get_embedding_client().check_model_availability(),
            "analysis_types": [t.value for t in AnalysisType]
        }
        
    except Exception as e:
        logger.error(f"Model list error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    """Test API endpoints"""
    print("=" * 80)
    print("AI API ENDPOINTS")
    print("=" * 80)
    print("\nAvailable endpoints:")
    print("  POST   /api/ai/analyze")
    print("  GET    /api/ai/stream/{scenario_id}")
    print("  GET    /api/ai/quick-summary/{scenario_id}")
    print("  POST   /api/ai/compare")
    print("  GET    /api/ai/health")
    print("  GET    /api/ai/models")
    print("\nTo run the API server:")
    print("  uvicorn api.main:app --reload")
    print("=" * 80)

# Made with Bob
