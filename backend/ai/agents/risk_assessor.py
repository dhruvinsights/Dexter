"""
Risk Assessment Agent
Analyzes collision risks and identifies high-risk orbital shells
"""
import sys
from pathlib import Path
from typing import Dict, Any

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from ai.llm_client import get_llm_client
from ai.prompts import build_risk_assessment_prompt, validate_metrics


class RiskAssessor:
    """
    Agent 1: Risk Assessment Agent
    
    Capabilities:
    - Analyze collision frequency trends
    - Identify high-risk orbital shells
    - Calculate Kessler syndrome probability
    - Provide 10-year and 30-year projections
    """
    
    def __init__(self):
        """Initialize risk assessor with LLM client"""
        self.llm = get_llm_client()
        self.agent_name = "Risk Assessment Agent"
    
    async def assess_risk(self, metrics: Dict[str, Any]) -> str:
        """
        Assess orbital collision risk based on scenario metrics
        
        Args:
            metrics: Dictionary containing scenario metrics
            
        Returns:
            Risk assessment text with level and analysis
            
        Raises:
            ValueError: If metrics are invalid
        """
        # Validate metrics
        if not validate_metrics(metrics):
            raise ValueError("Invalid metrics for risk assessment")
        
        # Build prompt
        prompt = build_risk_assessment_prompt(metrics)
        
        # Generate assessment
        assessment = await self.llm.generate(prompt)
        
        return assessment.strip()
    
    async def stream_assessment(self, metrics: Dict[str, Any]):
        """
        Stream risk assessment tokens in real-time
        
        Args:
            metrics: Dictionary containing scenario metrics
            
        Yields:
            Assessment text tokens
        """
        if not validate_metrics(metrics):
            raise ValueError("Invalid metrics for risk assessment")
        
        prompt = build_risk_assessment_prompt(metrics)
        
        async for token in self.llm.stream(prompt):
            yield token
    
    def extract_risk_level(self, assessment: str) -> str:
        """
        Extract risk level from assessment text
        
        Args:
            assessment: Full risk assessment text
            
        Returns:
            Risk level (Critical/High/Moderate/Low)
        """
        assessment_lower = assessment.lower()
        
        if 'critical' in assessment_lower[:200]:
            return 'Critical'
        elif 'high' in assessment_lower[:200]:
            return 'High'
        elif 'moderate' in assessment_lower[:200]:
            return 'Moderate'
        else:
            return 'Low'


if __name__ == "__main__":
    """Test risk assessor"""
    import asyncio
    
    print("=" * 80)
    print("RISK ASSESSMENT AGENT TEST")
    print("=" * 80)
    
    async def test():
        try:
            assessor = RiskAssessor()
            
            # Test metrics
            test_metrics = {
                'scenario_id': 'test_baseline_2024',
                'collision_frequency': 18.7,
                'debris_growth_pct': 45.2,
                'survivability_pct': 72.5,
                'congestion_index': 125,
                'score': 45,
                'grade': 'D',
                'shell_breakdown': [
                    {
                        'shell_label': 'LEO-2 (600-800km)',
                        'debris_change_pct': 52.3,
                        'total_collisions': 78
                    },
                    {
                        'shell_label': 'LEO-1 (400-600km)',
                        'debris_change_pct': 38.1,
                        'total_collisions': 56
                    }
                ]
            }
            
            print("\nGenerating risk assessment...")
            assessment = await assessor.assess_risk(test_metrics)
            
            print(f"\nRisk Assessment:")
            print("-" * 80)
            print(assessment)
            print("-" * 80)
            
            risk_level = assessor.extract_risk_level(assessment)
            print(f"\nExtracted Risk Level: {risk_level}")
            
            print("\n✓ Risk assessor test complete")
            
        except Exception as e:
            print(f"✗ Error: {e}")
    
    asyncio.run(test())
    print("=" * 80)

# Made with Bob