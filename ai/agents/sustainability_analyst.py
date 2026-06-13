"""
Sustainability Analysis Agent
Deep-dive into long-term orbital sustainability trajectory
"""
import sys
from pathlib import Path
from typing import Dict, Any, Optional

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from ai.llm_client import get_llm_client
from ai.prompts import build_sustainability_analysis_prompt, validate_metrics


class SustainabilityAnalyst:
    """
    Agent 3: Sustainability Analysis Agent
    
    Capabilities:
    - Long-term sustainability trajectory analysis
    - Critical threshold detection
    - Survivability implications for operators
    - 50-year prognosis
    """
    
    def __init__(self):
        """Initialize sustainability analyst with LLM client"""
        self.llm = get_llm_client()
        self.agent_name = "Sustainability Analysis Agent"
    
    async def analyze_sustainability(
        self,
        metrics: Dict[str, Any],
        baseline_metrics: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Analyze long-term orbital sustainability trajectory
        
        Args:
            metrics: Dictionary containing scenario metrics
            baseline_metrics: Optional baseline metrics for comparison
            
        Returns:
            Sustainability analysis text
            
        Raises:
            ValueError: If metrics are invalid
        """
        # Validate metrics
        if not validate_metrics(metrics):
            raise ValueError("Invalid metrics for sustainability analysis")
        
        # Build prompt
        prompt = build_sustainability_analysis_prompt(metrics, baseline_metrics)
        
        # Generate analysis
        analysis = await self.llm.generate(prompt)
        
        return analysis.strip()
    
    async def stream_analysis(
        self,
        metrics: Dict[str, Any],
        baseline_metrics: Optional[Dict[str, Any]] = None
    ):
        """
        Stream sustainability analysis tokens in real-time
        
        Args:
            metrics: Dictionary containing scenario metrics
            baseline_metrics: Optional baseline metrics for comparison
            
        Yields:
            Analysis text tokens
        """
        if not validate_metrics(metrics):
            raise ValueError("Invalid metrics for sustainability analysis")
        
        prompt = build_sustainability_analysis_prompt(metrics, baseline_metrics)
        
        async for token in self.llm.stream(prompt):
            yield token
    
    def extract_trajectory(self, analysis: str) -> str:
        """
        Extract sustainability trajectory from analysis
        
        Args:
            analysis: Full sustainability analysis text
            
        Returns:
            Trajectory direction (improving/stable/degrading)
        """
        analysis_lower = analysis.lower()
        
        # Look for trajectory indicators
        if any(word in analysis_lower for word in ['improving', 'positive', 'toward sustainability']):
            return 'improving'
        elif any(word in analysis_lower for word in ['degrading', 'worsening', 'away from sustainability']):
            return 'degrading'
        else:
            return 'stable'
    
    def identify_critical_thresholds(self, analysis: str) -> list:
        """
        Identify critical thresholds mentioned in analysis
        
        Args:
            analysis: Full sustainability analysis text
            
        Returns:
            List of critical threshold warnings
        """
        thresholds = []
        analysis_lower = analysis.lower()
        
        if 'kessler' in analysis_lower:
            thresholds.append('Kessler cascade risk')
        if 'critical' in analysis_lower and 'threshold' in analysis_lower:
            thresholds.append('Critical density threshold')
        if 'tipping point' in analysis_lower:
            thresholds.append('Tipping point approaching')
        
        return thresholds
    
    def calculate_sustainability_index(self, metrics: Dict[str, Any]) -> float:
        """
        Calculate a simple sustainability index from metrics
        
        Args:
            metrics: Dictionary containing scenario metrics
            
        Returns:
            Sustainability index (0-100)
        """
        # Weighted combination of key metrics
        survivability = metrics.get('survivability_pct', 50)
        debris_growth = metrics.get('debris_growth_pct', 50)
        collision_freq = metrics.get('collision_frequency', 20)
        
        # Lower debris growth and collision frequency is better
        debris_score = max(0, 100 - debris_growth)
        collision_score = max(0, 100 - (collision_freq * 3))
        
        # Weighted average
        index = (survivability * 0.4 + debris_score * 0.3 + collision_score * 0.3)
        
        return round(index, 1)


if __name__ == "__main__":
    """Test sustainability analyst"""
    import asyncio
    
    print("=" * 80)
    print("SUSTAINABILITY ANALYSIS AGENT TEST")
    print("=" * 80)
    
    async def test():
        try:
            analyst = SustainabilityAnalyst()
            
            # Test metrics
            test_metrics = {
                'scenario_id': 'test_hybrid_2024',
                'collision_frequency': 12.5,
                'debris_growth_pct': 15.3,
                'survivability_pct': 87.2,
                'congestion_index': 95,
                'score': 78,
                'grade': 'B',
                'collision_reduction_pct': 35.2
            }
            
            baseline_metrics = {
                'scenario_id': 'baseline_2024',
                'collision_frequency': 18.7,
                'debris_growth_pct': 45.2,
                'survivability_pct': 72.5,
                'congestion_index': 125
            }
            
            print("\nGenerating sustainability analysis...")
            analysis = await analyst.analyze_sustainability(test_metrics, baseline_metrics)
            
            print(f"\nSustainability Analysis:")
            print("-" * 80)
            print(analysis)
            print("-" * 80)
            
            trajectory = analyst.extract_trajectory(analysis)
            print(f"\nExtracted Trajectory: {trajectory}")
            
            thresholds = analyst.identify_critical_thresholds(analysis)
            print(f"Critical Thresholds: {thresholds if thresholds else 'None identified'}")
            
            index = analyst.calculate_sustainability_index(test_metrics)
            print(f"Sustainability Index: {index}/100")
            
            print("\n✓ Sustainability analyst test complete")
            
        except Exception as e:
            print(f"✗ Error: {e}")
    
    asyncio.run(test())
    print("=" * 80)

# Made with Bob