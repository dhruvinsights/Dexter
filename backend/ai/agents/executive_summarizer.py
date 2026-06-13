"""
Executive Summary Agent
Generates boardroom-ready 3-paragraph summaries
"""
import sys
from pathlib import Path
from typing import Dict, Any

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from ai.llm_client import get_llm_client
from ai.prompts import build_executive_summary_prompt, validate_metrics


class ExecutiveSummarizer:
    """
    Agent 4: Executive Summary Agent
    
    Capabilities:
    - Generate boardroom-ready 3-paragraph summary
    - Situation overview
    - Key findings (lead with most important metric)
    - Clear recommendation for leadership
    """
    
    def __init__(self):
        """Initialize executive summarizer with LLM client"""
        self.llm = get_llm_client()
        self.agent_name = "Executive Summary Agent"
    
    async def generate_summary(
        self,
        metrics: Dict[str, Any],
        scenario_name: str
    ) -> str:
        """
        Generate executive summary for a scenario
        
        Args:
            metrics: Dictionary containing scenario metrics
            scenario_name: Human-readable scenario name
            
        Returns:
            Executive summary text (3 paragraphs)
            
        Raises:
            ValueError: If metrics are invalid
        """
        # Validate metrics
        if not validate_metrics(metrics):
            raise ValueError("Invalid metrics for executive summary")
        
        # Build prompt
        prompt = build_executive_summary_prompt(metrics, scenario_name)
        
        # Generate summary
        summary = await self.llm.generate(prompt)
        
        return summary.strip()
    
    async def stream_summary(
        self,
        metrics: Dict[str, Any],
        scenario_name: str
    ):
        """
        Stream executive summary tokens in real-time
        
        Args:
            metrics: Dictionary containing scenario metrics
            scenario_name: Human-readable scenario name
            
        Yields:
            Summary text tokens
        """
        if not validate_metrics(metrics):
            raise ValueError("Invalid metrics for executive summary")
        
        prompt = build_executive_summary_prompt(metrics, scenario_name)
        
        async for token in self.llm.stream(prompt):
            yield token
    
    def validate_summary_format(self, summary: str) -> bool:
        """
        Validate that summary follows 3-paragraph format
        
        Args:
            summary: Generated summary text
            
        Returns:
            True if format is valid
        """
        # Split by double newlines (paragraph breaks)
        paragraphs = [p.strip() for p in summary.split('\n\n') if p.strip()]
        
        # Should have 3 paragraphs
        if len(paragraphs) < 2 or len(paragraphs) > 4:
            return False
        
        # Should not contain bullet points
        if any(line.strip().startswith(('-', '•', '*')) for line in summary.split('\n')):
            return False
        
        return True
    
    def extract_key_recommendation(self, summary: str) -> str:
        """
        Extract the key recommendation from summary
        
        Args:
            summary: Full executive summary text
            
        Returns:
            Key recommendation sentence
        """
        # Look in last paragraph for recommendation
        paragraphs = [p.strip() for p in summary.split('\n\n') if p.strip()]
        
        if paragraphs:
            last_para = paragraphs[-1]
            # Find sentences with recommendation keywords
            sentences = last_para.split('.')
            for sentence in sentences:
                if any(word in sentence.lower() for word in ['recommend', 'should', 'must', 'propose']):
                    return sentence.strip() + '.'
        
        return "No clear recommendation found"
    
    def count_paragraphs(self, summary: str) -> int:
        """
        Count paragraphs in summary
        
        Args:
            summary: Summary text
            
        Returns:
            Number of paragraphs
        """
        paragraphs = [p.strip() for p in summary.split('\n\n') if p.strip()]
        return len(paragraphs)


if __name__ == "__main__":
    """Test executive summarizer"""
    import asyncio
    
    print("=" * 80)
    print("EXECUTIVE SUMMARY AGENT TEST")
    print("=" * 80)
    
    async def test():
        try:
            summarizer = ExecutiveSummarizer()
            
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
            
            scenario_name = "Hybrid Intervention Strategy 2024"
            
            print(f"\nGenerating executive summary for: {scenario_name}")
            summary = await summarizer.generate_summary(test_metrics, scenario_name)
            
            print(f"\nExecutive Summary:")
            print("=" * 80)
            print(summary)
            print("=" * 80)
            
            # Validate format
            is_valid = summarizer.validate_summary_format(summary)
            print(f"\nFormat Valid: {is_valid}")
            
            # Count paragraphs
            para_count = summarizer.count_paragraphs(summary)
            print(f"Paragraph Count: {para_count}")
            
            # Extract recommendation
            recommendation = summarizer.extract_key_recommendation(summary)
            print(f"\nKey Recommendation: {recommendation}")
            
            print("\n✓ Executive summarizer test complete")
            
        except Exception as e:
            print(f"✗ Error: {e}")
    
    asyncio.run(test())
    print("=" * 80)

# Made with Bob