"""
Analysis Service - Orchestrates AI Agent Analysis
Routes requests to appropriate agents and manages response generation
"""
import logging
from datetime import datetime
from typing import Optional
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from ai.llm_client import get_llm_client
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
    """Service for orchestrating AI analysis"""
    
    def __init__(self):
        """Initialize analysis service"""
        self.llm = get_llm_client()
        logger.info("Analysis service initialized")
    
    async def run_analysis(self, request: AnalysisRequest) -> AnalysisResponse:
        """
        Run AI analysis based on request type
        
        Args:
            request: Analysis request with type and metrics
            
        Returns:
            Analysis response with generated content
        """
        start_time = datetime.utcnow()
        
        try:
            # Build appropriate prompt based on analysis type
            prompt = self._build_prompt(request)
            
            # Generate response using LLM
            logger.info(f"Generating {request.analysis_type} analysis...")
            content = await self.llm.generate(prompt)
            
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
            
            logger.info(f"✓ Analysis complete in {latency:.2f}s")
            return response
            
        except Exception as e:
            logger.error(f"Error during analysis: {e}", exc_info=True)
            raise
    
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
        Stream analysis tokens in real-time
        
        Args:
            request: Analysis request
            
        Yields:
            Text tokens as they are generated
        """
        try:
            # Build prompt
            prompt = self._build_prompt(request)
            
            # Stream response
            logger.info(f"Streaming {request.analysis_type} analysis...")
            async for token in self.llm.stream(prompt):
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
