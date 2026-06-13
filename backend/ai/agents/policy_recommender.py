"""
Policy Recommendation Agent
Compares intervention strategies and recommends best approach
"""
import sys
from pathlib import Path
from typing import Dict, Any, List

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from ai.llm_client import get_llm_client
from ai.prompts import build_recommendation_prompt, validate_comparison


class PolicyRecommender:
    """
    Agent 2: Policy Recommendation Agent
    
    Capabilities:
    - Compare intervention strategies
    - Cost-benefit analysis
    - Trade-off identification
    - Actionable policy suggestions
    """
    
    def __init__(self):
        """Initialize policy recommender with LLM client"""
        self.llm = get_llm_client()
        self.agent_name = "Policy Recommendation Agent"
    
    async def recommend_policy(self, comparison: Dict[str, Any]) -> str:
        """
        Generate policy recommendation based on scenario comparison
        
        Args:
            comparison: Dictionary containing comparison results with:
                - ranked: List of scenario IDs in order
                - scores: Dict of scenario scores
                - winner: Best performing scenario ID
                - metrics: Dict of scenario metrics
            
        Returns:
            Policy recommendation text
            
        Raises:
            ValueError: If comparison data is invalid
        """
        # Validate comparison data
        if not validate_comparison(comparison):
            raise ValueError("Invalid comparison data for policy recommendation")
        
        # Build prompt
        prompt = build_recommendation_prompt(comparison)
        
        # Generate recommendation
        recommendation = await self.llm.generate(prompt)
        
        return recommendation.strip()
    
    async def stream_recommendation(self, comparison: Dict[str, Any]):
        """
        Stream policy recommendation tokens in real-time
        
        Args:
            comparison: Dictionary containing comparison results
            
        Yields:
            Recommendation text tokens
        """
        if not validate_comparison(comparison):
            raise ValueError("Invalid comparison data for policy recommendation")
        
        prompt = build_recommendation_prompt(comparison)
        
        async for token in self.llm.stream(prompt):
            yield token
    
    def extract_top_recommendation(self, recommendation: str) -> str:
        """
        Extract the #1 recommended strategy from recommendation text
        
        Args:
            recommendation: Full recommendation text
            
        Returns:
            Name of top recommended strategy
        """
        # Look for common patterns in first paragraph
        lines = recommendation.split('\n')
        for line in lines[:5]:
            line_lower = line.lower()
            if 'hybrid' in line_lower and ('recommend' in line_lower or '#1' in line_lower):
                return 'hybrid'
            elif 'adr' in line_lower and 'aggressive' in line_lower:
                return 'adr_aggressive'
            elif 'launch' in line_lower and 'cap' in line_lower:
                return 'launch_cap'
        
        return 'unknown'
    
    def rank_scenarios(self, scores: Dict[str, Dict[str, Any]]) -> List[str]:
        """
        Rank scenarios by total score
        
        Args:
            scores: Dictionary of scenario scores
            
        Returns:
            List of scenario IDs ranked by score (best first)
        """
        ranked = sorted(
            scores.items(),
            key=lambda x: x[1].get('total_score', 0),
            reverse=True
        )
        return [scenario_id for scenario_id, _ in ranked]


if __name__ == "__main__":
    """Test policy recommender"""
    import asyncio
    
    print("=" * 80)
    print("POLICY RECOMMENDATION AGENT TEST")
    print("=" * 80)
    
    async def test():
        try:
            recommender = PolicyRecommender()
            
            # Test comparison data
            test_comparison = {
                "ranked": ["hybrid_2024", "adr_aggressive_2024", "launch_cap_2024", "baseline_2024"],
                "winner": "hybrid_2024",
                "scores": {
                    "hybrid_2024": {"total_score": 78, "grade": "B"},
                    "adr_aggressive_2024": {"total_score": 72, "grade": "C"},
                    "launch_cap_2024": {"total_score": 65, "grade": "D"},
                    "baseline_2024": {"total_score": 45, "grade": "F"}
                },
                "metrics": {
                    "hybrid_2024": {"collision_reduction_pct": 35.2},
                    "adr_aggressive_2024": {"collision_reduction_pct": 28.5},
                    "launch_cap_2024": {"collision_reduction_pct": 18.3},
                    "baseline_2024": {"collision_reduction_pct": 0.0}
                }
            }
            
            print("\nGenerating policy recommendation...")
            recommendation = await recommender.recommend_policy(test_comparison)
            
            print(f"\nPolicy Recommendation:")
            print("-" * 80)
            print(recommendation)
            print("-" * 80)
            
            top_rec = recommender.extract_top_recommendation(recommendation)
            print(f"\nExtracted Top Recommendation: {top_rec}")
            
            print("\n✓ Policy recommender test complete")
            
        except Exception as e:
            print(f"✗ Error: {e}")
    
    asyncio.run(test())
    print("=" * 80)

# Made with Bob