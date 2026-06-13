"""
Test Suite for AI Agents
Comprehensive tests for all AI agent capabilities
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from ai.analyst import run_analysis
from ai.models.ai_models import AnalysisRequest, AnalysisType
from ai.llm_client import get_llm_client
from ai.embeddings.ollama_client import get_embedding_client


# Test data
TEST_METRICS = {
    'scenario_id': 'test_hybrid_2024',
    'collision_frequency': 12.5,
    'debris_growth_pct': 15.3,
    'survivability_pct': 87.2,
    'congestion_index': 95,
    'score': 78,
    'grade': 'B',
    'collision_reduction_pct': 35.2,
    'shell_breakdown': [
        {
            'shell_label': 'LEO-2 (600-800km)',
            'debris_change_pct': 18.5,
            'total_collisions': 45
        },
        {
            'shell_label': 'LEO-1 (400-600km)',
            'debris_change_pct': 12.3,
            'total_collisions': 32
        }
    ]
}

TEST_COMPARISON = {
    'ranked': ['hybrid_2024', 'adr_aggressive_2024', 'launch_cap_2024', 'baseline_2024'],
    'winner': 'hybrid_2024',
    'scores': {
        'hybrid_2024': {'total_score': 78, 'grade': 'B'},
        'adr_aggressive_2024': {'total_score': 72, 'grade': 'C'},
        'launch_cap_2024': {'total_score': 65, 'grade': 'D'},
        'baseline_2024': {'total_score': 45, 'grade': 'F'}
    },
    'metrics': {
        'hybrid_2024': {'collision_reduction_pct': 35.2},
        'adr_aggressive_2024': {'collision_reduction_pct': 28.5},
        'launch_cap_2024': {'collision_reduction_pct': 15.0},
        'baseline_2024': {'collision_reduction_pct': 0.0}
    }
}


async def test_llm_client():
    """Test LLM client connectivity"""
    print("\n" + "=" * 80)
    print("TEST 1: LLM Client")
    print("=" * 80)
    
    try:
        llm = get_llm_client()
        
        # Health check
        if await llm.health_check():
            print("✓ LLM service is healthy")
        else:
            print("✗ LLM service is not available")
            return False
        
        # Model availability
        if llm.check_model_availability():
            print(f"✓ Model {llm.model} is available")
        else:
            print(f"✗ Model {llm.model} is not available")
            return False
        
        # Test generation
        print("\nTesting text generation...")
        response = await llm.generate("What is orbital debris? Answer in one sentence.")
        print(f"✓ Generated response ({len(response)} characters)")
        print(f"  Preview: {response[:100]}...")
        
        return True
        
    except Exception as e:
        print(f"✗ LLM client test failed: {e}")
        return False


async def test_embedding_client():
    """Test embedding client connectivity"""
    print("\n" + "=" * 80)
    print("TEST 2: Embedding Client")
    print("=" * 80)
    
    try:
        embedding = get_embedding_client()
        
        # Health check
        if await embedding.health_check():
            print("✓ Embedding service is healthy")
        else:
            print("✗ Embedding service is not available")
            return False
        
        # Model availability
        if embedding.check_model_availability():
            print(f"✓ Model {embedding.embedding_model} is available")
        else:
            print(f"✗ Model {embedding.embedding_model} is not available")
            return False
        
        # Test embedding generation
        print("\nTesting embedding generation...")
        test_text = "Orbital debris poses a significant threat to space sustainability"
        embedding_vector = embedding.embed_text(test_text)
        print(f"✓ Generated embedding (dimension: {len(embedding_vector)})")
        print(f"  First 5 values: {embedding_vector[:5]}")
        
        return True
        
    except Exception as e:
        print(f"✗ Embedding client test failed: {e}")
        return False


async def test_risk_assessment():
    """Test risk assessment agent"""
    print("\n" + "=" * 80)
    print("TEST 3: Risk Assessment Agent")
    print("=" * 80)
    
    try:
        request = AnalysisRequest(
            analysis_type=AnalysisType.RISK_ASSESSMENT,
            metrics=TEST_METRICS,
            scenario_name="Test Hybrid Scenario"
        )
        
        print("Running risk assessment analysis...")
        response = await run_analysis(request)
        
        print(f"✓ Analysis complete ({response.latency_seconds}s)")
        print(f"  Model: {response.model_used}")
        print(f"  Content length: {len(response.content)} characters")
        print(f"\nGenerated Analysis:")
        print("-" * 80)
        print(response.content)
        print("-" * 80)
        
        # Validate response
        assert response.analysis_type == AnalysisType.RISK_ASSESSMENT
        assert response.scenario_id == TEST_METRICS['scenario_id']
        assert len(response.content) > 100
        
        return True
        
    except Exception as e:
        print(f"✗ Risk assessment test failed: {e}")
        return False


async def test_policy_recommendation():
    """Test policy recommendation agent"""
    print("\n" + "=" * 80)
    print("TEST 4: Policy Recommendation Agent")
    print("=" * 80)
    
    try:
        request = AnalysisRequest(
            analysis_type=AnalysisType.RECOMMENDATION,
            metrics={},
            comparison=TEST_COMPARISON
        )
        
        print("Running policy recommendation analysis...")
        response = await run_analysis(request)
        
        print(f"✓ Analysis complete ({response.latency_seconds}s)")
        print(f"  Model: {response.model_used}")
        print(f"  Content length: {len(response.content)} characters")
        print(f"\nGenerated Recommendation:")
        print("-" * 80)
        print(response.content)
        print("-" * 80)
        
        # Validate response
        assert response.analysis_type == AnalysisType.RECOMMENDATION
        assert len(response.content) > 100
        
        return True
        
    except Exception as e:
        print(f"✗ Policy recommendation test failed: {e}")
        return False


async def test_sustainability_analysis():
    """Test sustainability analysis agent"""
    print("\n" + "=" * 80)
    print("TEST 5: Sustainability Analysis Agent")
    print("=" * 80)
    
    try:
        request = AnalysisRequest(
            analysis_type=AnalysisType.SUSTAINABILITY_ANALYSIS,
            metrics=TEST_METRICS,
            scenario_name="Test Hybrid Scenario"
        )
        
        print("Running sustainability analysis...")
        response = await run_analysis(request)
        
        print(f"✓ Analysis complete ({response.latency_seconds}s)")
        print(f"  Model: {response.model_used}")
        print(f"  Content length: {len(response.content)} characters")
        print(f"\nGenerated Analysis:")
        print("-" * 80)
        print(response.content)
        print("-" * 80)
        
        # Validate response
        assert response.analysis_type == AnalysisType.SUSTAINABILITY_ANALYSIS
        assert response.scenario_id == TEST_METRICS['scenario_id']
        assert len(response.content) > 100
        
        return True
        
    except Exception as e:
        print(f"✗ Sustainability analysis test failed: {e}")
        return False


async def test_executive_summary():
    """Test executive summary agent"""
    print("\n" + "=" * 80)
    print("TEST 6: Executive Summary Agent")
    print("=" * 80)
    
    try:
        request = AnalysisRequest(
            analysis_type=AnalysisType.EXECUTIVE_SUMMARY,
            metrics=TEST_METRICS,
            scenario_name="Test Hybrid Scenario"
        )
        
        print("Running executive summary generation...")
        response = await run_analysis(request)
        
        print(f"✓ Analysis complete ({response.latency_seconds}s)")
        print(f"  Model: {response.model_used}")
        print(f"  Content length: {len(response.content)} characters")
        print(f"\nGenerated Summary:")
        print("-" * 80)
        print(response.content)
        print("-" * 80)
        
        # Validate response
        assert response.analysis_type == AnalysisType.EXECUTIVE_SUMMARY
        assert response.scenario_id == TEST_METRICS['scenario_id']
        assert len(response.content) > 100
        
        # Check for 3-paragraph structure (rough check)
        paragraphs = [p.strip() for p in response.content.split('\n\n') if p.strip()]
        print(f"\n  Detected {len(paragraphs)} paragraphs")
        
        return True
        
    except Exception as e:
        print(f"✗ Executive summary test failed: {e}")
        return False


async def run_all_tests():
    """Run all tests"""
    print("=" * 80)
    print("ORBITAL SENTINEL AI AGENTS - COMPREHENSIVE TEST SUITE")
    print("=" * 80)
    
    results = {}
    
    # Test 1: LLM Client
    results['llm_client'] = await test_llm_client()
    
    # Test 2: Embedding Client
    results['embedding_client'] = await test_embedding_client()
    
    # Only run agent tests if LLM is available
    if results['llm_client']:
        # Test 3: Risk Assessment
        results['risk_assessment'] = await test_risk_assessment()
        
        # Test 4: Policy Recommendation
        results['policy_recommendation'] = await test_policy_recommendation()
        
        # Test 5: Sustainability Analysis
        results['sustainability_analysis'] = await test_sustainability_analysis()
        
        # Test 6: Executive Summary
        results['executive_summary'] = await test_executive_summary()
    else:
        print("\n⚠ Skipping agent tests (LLM not available)")
        print("  Ensure Ollama is running and models are pulled:")
        print("    ollama pull granite-code:8b")
        print("    ollama pull granite-embedding")
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status} - {test_name.replace('_', ' ').title()}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        return True
    else:
        print(f"\n⚠ {total - passed} test(s) failed")
        return False


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)

# Made with Bob
