"""
Analysis Service - Orchestrates AI Agent Analysis with RAG
Routes requests to appropriate agents and manages response generation
"""
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from ai.llm_client import get_llm_client
from ai.data_service import AIDataService
from ai.prompts import (
    build_risk_assessment_prompt,
    build_recommendation_prompt,
    build_sustainability_analysis_prompt,
    build_executive_summary_prompt,
    validate_metrics,
    validate_comparison
)
from ai.models.ai_models import (
    AnalysisRequest,
    AnalysisResponse,
    AnalysisType
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AnalysisService:
    """Service for orchestrating AI analysis with RAG"""
    
    def __init__(self):
        """Initialize analysis service"""
        self.llm = get_llm_client()
        self.data_service = AIDataService()
        logger.info("Analysis service initialized with RAG support")
    
    async def run_analysis(self, request: AnalysisRequest) -> AnalysisResponse:
        """
        Run AI analysis based on request type with RAG
        
        Args:
            request: Analysis request with type and metrics
            
        Returns:
            Analysis response with generated content
        """
        start_time = datetime.utcnow()
        
        try:
            # Build appropriate prompt based on analysis type
            base_prompt = self._build_prompt(request)
            
            # Retrieve relevant documents from database (RAG)
            relevant_docs = self._retrieve_relevant_documents(request.analysis_type)
            
            # Enhance prompt with retrieved context
            enhanced_prompt = self._enhance_prompt_with_context(base_prompt, relevant_docs)
            
            # Generate response using LLM with enhanced prompt
            logger.info(f"Generating {request.analysis_type} analysis with RAG context...")
            content = await self.llm.generate(enhanced_prompt)
            
            # Calculate latency
            latency = (datetime.utcnow() - start_time).total_seconds()
            
            # Create response
            response = AnalysisResponse(
                analysis_type=request.analysis_type,
                scenario_id=request.metrics.get('scenario_id'),
                content=content.strip(),
                model_used=self.llm.model,
                generated_at=datetime.utcnow().isoformat(),
                latency_seconds=round(latency, 2)
            )
            
            logger.info(f"✓ Analysis complete in {latency:.2f}s (with RAG)")
            return response
            
        except Exception as e:
            logger.error(f"Error during analysis: {e}", exc_info=True)
            raise
    
    async def chat(
        self,
        question: str,
        metrics: Optional[Dict[str, Any]] = None,
        scenario_name: Optional[str] = None,
    ) -> "ChatResponse":
        """
        Free-text conversational reply. Unlike run_analysis, this does NOT force a
        structured report — it answers the user's actual message, using the current
        simulation metrics only when relevant (so "hi" gets a greeting, not a risk
        assessment).
        """
        from ai.models.ai_models import ChatResponse  # local import avoids cycle

        start_time = datetime.utcnow()
        metrics = metrics or {}

        # Compact, human-readable context of the loaded scenario.
        keys = [
            "scenario_id", "collision_frequency", "debris_growth_pct",
            "survivability_pct", "congestion_index", "simulation_years", "final_total",
        ]
        ctx = "\n".join(f"- {k}: {metrics[k]}" for k in keys if metrics.get(k) is not None)
        ctx = ctx or "(no scenario currently loaded)"

        system_prompt = (
            "You are Dexter's orbital-sustainability assistant. Reply conversationally "
            "and concisely to the user's message. For greetings or general questions, "
            "answer naturally in 1-3 sentences. Only produce a structured, numbered risk "
            "report when the user explicitly asks for an analysis. Use the simulation "
            "context only when it is relevant to what was asked."
        )
        prompt = f"Current simulation context:\n{ctx}\n\nUser: {question}\nAssistant:"

        # Best-effort RAG grounding; never let a missing DB table break chat.
        try:
            docs = self.data_service.get_policy_documents(search_term=question)
            if docs:
                prompt = self._enhance_prompt_with_context(prompt, docs[:3])
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Chat RAG skipped: {e}")

        content = await self.llm.generate(prompt, system_prompt=system_prompt)
        latency = (datetime.utcnow() - start_time).total_seconds()
        logger.info(f"✓ Chat reply in {latency:.2f}s")
        return ChatResponse(
            content=content.strip(),
            scenario_id=metrics.get("scenario_id"),
            model_used=self.llm.model,
            generated_at=datetime.utcnow().isoformat(),
            latency_seconds=round(latency, 2),
        )

    def _retrieve_relevant_documents(self, analysis_type: AnalysisType) -> List[Dict[str, Any]]:
        """
        Retrieve relevant documents from database based on analysis type
        
        Args:
            analysis_type: Type of analysis being performed
            
        Returns:
            List of relevant document dictionaries
        """
        try:
            # Define search terms based on analysis type
            search_terms = {
                AnalysisType.RISK_ASSESSMENT: "risk collision debris mitigation",
                AnalysisType.SUSTAINABILITY_ANALYSIS: "sustainability orbital environment guidelines",
                AnalysisType.RECOMMENDATION: "policy recommendation standards",
                AnalysisType.EXECUTIVE_SUMMARY: "orbital debris space sustainability"
            }
            
            search_term = search_terms.get(analysis_type, "orbital debris")
            
            # Retrieve documents from database
            logger.info(f"Retrieving documents from DB2 for: {search_term}")
            documents = self.data_service.get_policy_documents(search_term=search_term)
            
            if documents:
                logger.info(f"✓ Retrieved {len(documents)} relevant documents from DB2")
            else:
                logger.warning("No documents found in database - proceeding without RAG context")
            
            return documents[:3]  # Limit to top 3 most relevant documents
            
        except Exception as e:
            logger.error(f"Error retrieving documents: {e}")
            return []  # Return empty list if retrieval fails
    
    def _enhance_prompt_with_context(self, base_prompt: str, documents: List[Dict[str, Any]]) -> str:
        """
        Enhance prompt with retrieved document context
        
        Args:
            base_prompt: Original prompt
            documents: Retrieved documents from database
            
        Returns:
            Enhanced prompt with context
        """
        if not documents:
            return base_prompt
        
        # Build context section from retrieved documents
        context_parts = []
        for i, doc in enumerate(documents, 1):
            # DB2 returns UPPERCASE column names; accept either case.
            title = doc.get('title') or doc.get('TITLE') or 'Unknown Document'
            content = doc.get('content') or doc.get('CONTENT') or ''
            
            # Truncate content to avoid token limits (max 1000 chars per doc)
            content_preview = content[:1000] + "..." if len(content) > 1000 else content
            
            context_parts.append(f"""
Document {i}: {title}
---
{content_preview}
""")
        
        context_section = "\n".join(context_parts)
        
        # Combine context with original prompt
        enhanced_prompt = f"""You are an expert orbital sustainability analyst. Use the following authoritative documents as context for your analysis:

=== KNOWLEDGE BASE CONTEXT ===
{context_section}

=== END CONTEXT ===

Now, based on the above context and your expertise, please provide the following analysis:

{base_prompt}

Remember to cite specific guidelines, standards, or recommendations from the context documents when relevant.
"""
        
        logger.info(f"✓ Enhanced prompt with {len(documents)} documents ({len(context_section)} chars of context)")
        return enhanced_prompt
    
    def _build_prompt(self, request: AnalysisRequest) -> str:
        """
        Build prompt based on analysis type
        
        Args:
            request: Analysis request
            
        Returns:
            Formatted prompt string
        """
        if request.analysis_type == AnalysisType.RISK_ASSESSMENT:
            if not validate_metrics(request.metrics):
                raise ValueError("Invalid metrics for risk assessment")
            return build_risk_assessment_prompt(request.metrics)
        
        elif request.analysis_type == AnalysisType.RECOMMENDATION:
            if not request.comparison:
                raise ValueError("Comparison data required for recommendation analysis")
            if not validate_comparison(request.comparison):
                raise ValueError("Invalid comparison data")
            return build_recommendation_prompt(request.comparison)
        
        elif request.analysis_type == AnalysisType.SUSTAINABILITY_ANALYSIS:
            if not validate_metrics(request.metrics):
                raise ValueError("Invalid metrics for sustainability analysis")
            return build_sustainability_analysis_prompt(
                request.metrics,
                request.baseline_metrics
            )
        
        elif request.analysis_type == AnalysisType.EXECUTIVE_SUMMARY:
            if not validate_metrics(request.metrics):
                raise ValueError("Invalid metrics for executive summary")
            scenario_name = request.scenario_name or request.metrics.get('scenario_id', 'Unknown')
            return build_executive_summary_prompt(request.metrics, scenario_name)
        
        else:
            raise ValueError(f"Unknown analysis type: {request.analysis_type}")
    
    async def stream_analysis(self, request: AnalysisRequest):
        """
        Stream analysis tokens in real-time with RAG
        
        Args:
            request: Analysis request
            
        Yields:
            Text tokens as they are generated
        """
        try:
            # Build base prompt
            base_prompt = self._build_prompt(request)
            
            # Retrieve relevant documents (RAG)
            relevant_docs = self._retrieve_relevant_documents(request.analysis_type)
            
            # Enhance prompt with context
            enhanced_prompt = self._enhance_prompt_with_context(base_prompt, relevant_docs)
            
            # Stream response with enhanced prompt
            logger.info(f"Streaming {request.analysis_type} analysis with RAG context...")
            async for token in self.llm.stream(enhanced_prompt):
                yield token
                
        except Exception as e:
            logger.error(f"Error during streaming: {e}", exc_info=True)
            raise


# Singleton instance
_analysis_service: Optional[AnalysisService] = None


def get_analysis_service() -> AnalysisService:
    """
    Get singleton analysis service instance
    
    Returns:
        AnalysisService instance
    """
    global _analysis_service
    
    if _analysis_service is None:
        _analysis_service = AnalysisService()
    
    return _analysis_service


async def run_analysis(request: AnalysisRequest) -> AnalysisResponse:
    """
    Convenience function to run analysis
    
    Args:
        request: Analysis request
        
    Returns:
        Analysis response
    """
    service = get_analysis_service()
    return await service.run_analysis(request)


async def run_chat(question: str, metrics=None, scenario_name=None):
    """Convenience function for a conversational reply."""
    service = get_analysis_service()
    return await service.chat(question, metrics=metrics, scenario_name=scenario_name)


if __name__ == "__main__":
    """Test analysis service"""
    import asyncio
    
    print("=" * 80)
    print("ANALYSIS SERVICE TEST")
    print("=" * 80)
    
    async def test():
        try:
            service = AnalysisService()
            
            # Test metrics
            test_metrics = {
                'scenario_id': 'test_hybrid_2024',
                'collision_frequency': 12.5,
                'debris_growth_pct': 15.3,
                'survivability_pct': 87.2,
                'congestion_index': 95,
                'score': 78,
                'grade': 'B',
                'shell_breakdown': [
                    {
                        'shell_label': 'LEO-2 (600-800km)',
                        'debris_change_pct': 18.5,
                        'total_collisions': 45
                    }
                ]
            }
            
            # Test risk assessment
            print("\n1. Testing Risk Assessment:")
            print("-" * 80)
            request = AnalysisRequest(
                analysis_type=AnalysisType.RISK_ASSESSMENT,
                metrics=test_metrics,
                scenario_name="Test Hybrid Scenario"
            )
            
            response = await service.run_analysis(request)
            print(f"✓ Generated analysis ({response.latency_seconds}s)")
            print(f"\nContent preview:")
            print(response.content[:300] + "...")
            
            # Test executive summary
            print("\n2. Testing Executive Summary:")
            print("-" * 80)
            request = AnalysisRequest(
                analysis_type=AnalysisType.EXECUTIVE_SUMMARY,
                metrics=test_metrics,
                scenario_name="Test Hybrid Scenario"
            )
            
            response = await service.run_analysis(request)
            print(f"✓ Generated summary ({response.latency_seconds}s)")
            print(f"\nContent preview:")
            print(response.content[:300] + "...")
            
            print("\n✓ Analysis service test complete")
            
        except Exception as e:
            print(f"✗ Error: {e}")
    
    asyncio.run(test())
    print("=" * 80)

# Made with Bob
