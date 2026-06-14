"""
AI Analysis API Endpoints
FastAPI router for AI agent analysis capabilities
"""
import sys
import json
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from datetime import datetime
import hashlib

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from ai.analyst import run_analysis, get_analysis_service
from ai.models.ai_models import (
    AnalysisRequest,
    AnalysisResponse,
    AnalysisType,
    AgentHealthCheck
)
from ai.llm_client import get_llm_client, reset_llm_client
from ai.runtime_config import get_runtime_config, AIProviderConfig
from ai.embeddings.ollama_client import get_embedding_client
from ai.embeddings.document_processor import DocumentProcessor
from ai.data_service import AIDataService
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


@router.post("/configure")
async def configure_ai(config: AIProviderConfig):
    """
    Configure AI provider settings dynamically
    
    Allows frontend to update AI provider (Ollama, OpenAI, Gemini, Custom)
    and related settings without restarting the backend.
    
    Args:
        config: AI provider configuration
        
    Returns:
        Success message and current configuration
    """
    try:
        logger.info(f"Received configuration request for provider: {config.provider}")
        
        # Validate configuration based on provider
        if config.provider == 'ollama':
            if not config.ollama_url or not config.ollama_model:
                raise HTTPException(
                    status_code=400,
                    detail="Ollama URL and model are required for Ollama provider"
                )
        elif config.provider == 'openai':
            if not config.openai_api_key or not config.openai_model:
                raise HTTPException(
                    status_code=400,
                    detail="OpenAI API key and model are required for OpenAI provider"
                )
        elif config.provider == 'gemini':
            if not config.gemini_api_key or not config.gemini_model:
                raise HTTPException(
                    status_code=400,
                    detail="Gemini API key and model are required for Gemini provider"
                )
        elif config.provider == 'custom':
            if not config.openai_api_key or not config.openai_base_url:
                raise HTTPException(
                    status_code=400,
                    detail="API key and base URL are required for custom provider"
                )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported provider: {config.provider}"
            )
        
        # Update runtime configuration
        get_runtime_config().update_config(config)
        
        # Reset LLM client to force reinitialization with new config
        reset_llm_client()
        
        # Test the new configuration
        llm = get_llm_client()
        health_ok = await llm.health_check()
        
        if not health_ok:
            logger.warning(f"Health check failed for new configuration: {config.provider}")
        
        return {
            "success": True,
            "message": f"AI provider configured successfully: {config.provider}",
            "provider": config.provider,
            "model": llm.model,
            "health_check": health_ok,
            "configuration": get_runtime_config().to_dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Configuration error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Configuration failed: {str(e)}")


@router.get("/configuration")
async def get_configuration():
    """
    Get current AI provider configuration
    
    Returns:
        Current configuration (without sensitive data like API keys)
    """
    try:
        config_dict = get_runtime_config().to_dict()
        llm = get_llm_client()
        
        return {
            "success": True,
            "configuration": config_dict,
            "current_model": llm.model,
            "current_provider": llm.provider
        }
    except Exception as e:
        logger.error(f"Failed to get configuration: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


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


@router.get("/documents")
async def list_documents():
    """
    List all documents in the knowledge base
    
    Returns:
        List of documents with metadata
    """
    try:
        data_service = AIDataService()
        documents = data_service.get_policy_documents()
        
        return {
            "success": True,
            "count": len(documents),
            "documents": [
                {
                    "doc_id": doc.get("doc_id") or doc.get("DOC_ID"),
                    "title": doc.get("title") or doc.get("TITLE"),
                    "filename": doc.get("source") or doc.get("SOURCE"),
                    "size": len(doc.get("content", "") or doc.get("CONTENT", "")),
                    "chunk_count": len(doc.get("content", "").split("\n\n")) if doc.get("content") else 0,
                    "created_at": str(doc.get("created_at") or doc.get("CREATED_AT", ""))
                }
                for doc in documents
            ]
        }
    except Exception as e:
        logger.error(f"Error listing documents: {e}", exc_info=True)
        # Return empty list if DB not available
        return {
            "success": False,
            "count": 0,
            "documents": [],
            "error": str(e)
        }


@router.post("/upload-document")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and process a document for RAG
    
    Supports: PDF, MD, TXT, JSON
    
    Args:
        file: Uploaded file
        
    Returns:
        Document metadata and processing status
    """
    try:
        # Validate file type
        allowed_extensions = {'.pdf', '.md', '.txt', '.json'}
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file_ext}. Allowed: {allowed_extensions}"
            )
        
        # Read file content
        content_bytes = await file.read()
        
        # Generate document ID
        doc_id = hashlib.md5(f"{file.filename}{datetime.utcnow()}".encode()).hexdigest()[:16]
        
        # Process document
        processor = DocumentProcessor()
        
        # Extract text based on file type
        if file_ext == '.pdf':
            # For PDF, we need to save temporarily and use pypdf
            import tempfile
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                tmp.write(content_bytes)
                tmp_path = tmp.name
            try:
                text = processor.load_pdf(tmp_path)
            finally:
                Path(tmp_path).unlink()
        elif file_ext == '.json':
            text = content_bytes.decode('utf-8')
        else:  # .md, .txt
            text = content_bytes.decode('utf-8')
        
        # Chunk the document
        chunks = processor.chunk_text(text)
        
        # Store in database
        try:
            db = get_db_connection()
            with db.get_cursor() as cursor:
                # Insert document
                query = """
                    INSERT INTO policy_documents
                    (doc_id, title, source, content, created_at)
                    VALUES (?, ?, ?, ?, ?)
                """
                cursor.execute(query, (
                    doc_id,
                    file.filename,
                    file.filename,
                    text,
                    datetime.utcnow()
                ))
                
                logger.info(f"✓ Stored document in DB2: {file.filename} ({len(chunks)} chunks)")
        except Exception as db_error:
            logger.warning(f"Could not store in DB2: {db_error}")
            # Continue anyway - document is processed
        
        return {
            "success": True,
            "doc_id": doc_id,
            "filename": file.filename,
            "size": len(content_bytes),
            "chunks": len(chunks),
            "message": f"Document processed successfully: {len(chunks)} chunks created"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document upload error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """
    Delete a document from the knowledge base
    
    Args:
        doc_id: Document identifier
        
    Returns:
        Success status
    """
    try:
        db = get_db_connection()
        with db.get_cursor() as cursor:
            # Delete document
            query = "DELETE FROM policy_documents WHERE doc_id = ?"
            cursor.execute(query, (doc_id,))
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Document not found")
            
            logger.info(f"✓ Deleted document: {doc_id}")
            
        return {
            "success": True,
            "message": f"Document deleted: {doc_id}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document deletion error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")


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
