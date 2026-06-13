"""
Prompt Templates for Orbital Sentinel AI Agents
Carefully engineered prompts for expert-level orbital sustainability analysis
"""

# System Persona - Sets the context for all AI responses
SYSTEM_PERSONA = """You are the Orbital Sustainability Analyst for Orbital Sentinel, 
an AI-powered orbital sustainability decision support platform.

You are a world-class expert in orbital mechanics, space debris mitigation, 
and international space policy. You have deep knowledge of:
- MIT MOCAT (Monte Carlo Object Collision Assessment) methodology
- ESA Space Debris Mitigation Guidelines
- Inter-Agency Space Debris Coordination Committee (IADC) standards
- Active Debris Removal (ADR) economics and engineering
- Kessler Syndrome dynamics and cascade risk assessment
- Orbital congestion management and traffic coordination

Your tone is: authoritative, precise, and clear. You translate technical 
simulation metrics into actionable insights for both engineers and executives.
You never hedge unnecessarily — you state conclusions clearly with evidence.

Always cite specific metric values in your responses.
Keep responses concise and structured (under 300 words unless a full report)."""


def build_risk_assessment_prompt(metrics: dict) -> str:
    """
    Build prompt for risk assessment analysis
    
    Args:
        metrics: Dictionary containing scenario metrics
        
    Returns:
        Formatted prompt string
    """
    return f"""{SYSTEM_PERSONA}

---
TASK: Risk Assessment

You are given orbital simulation metrics for the scenario: {metrics.get('scenario_id', 'Unknown')}

METRICS:
- Collision Frequency: {metrics.get('collision_frequency', 'N/A')} events/year (30-year avg)
- Debris Growth: {metrics.get('debris_growth_pct', 'N/A')}% over simulation period
- Survivability Index: {metrics.get('survivability_pct', 'N/A')}%
- Congestion Index: {metrics.get('congestion_index', 'N/A')} (100 = current baseline)
- Sustainability Score: {metrics.get('score', 'N/A')}/100 (Grade: {metrics.get('grade', 'N/A')})

SHELL BREAKDOWN (worst performing shells):
{_format_shell_breakdown(metrics.get('shell_breakdown', []))}

---
Provide a concise risk assessment covering:
1. Overall risk level (Critical / High / Moderate / Low) and the primary driver
2. Which orbital shells are most at risk and why
3. The 10-year and 30-year risk trajectory
4. The single most important warning for decision makers

Format your response in 3–4 short paragraphs. Start with the risk level statement.
---
Orbital Sustainability Analyst:"""


def build_recommendation_prompt(comparison: dict) -> str:
    """
    Build prompt for policy recommendation analysis
    
    Args:
        comparison: Dictionary containing comparison results
        
    Returns:
        Formatted prompt string
    """
    ranked = comparison.get("ranked", [])
    scores = comparison.get("scores", {})
    winner = comparison.get("winner", "")
    
    scenario_summaries = "\n".join([
        f"- {sid}: Score {scores.get(sid, {}).get('total_score', 'N/A')}/100 "
        f"(Grade {scores.get(sid, {}).get('grade', 'N/A')}) | "
        f"Collision reduction: {comparison.get('metrics', {}).get(sid, {}).get('collision_reduction_pct', 0):.1f}%"
        for sid in ranked if sid in scores
    ])
    
    return f"""{SYSTEM_PERSONA}

---
TASK: Policy Recommendation

You have analyzed 4 orbital intervention scenarios. Here are their ranked sustainability scores:

{scenario_summaries}

Top performer: {winner}

Scenario Descriptions:
- baseline_2024: No intervention — business as usual
- adr_aggressive_2024: Active Debris Removal targeting 500-800km shells at 50 obj/yr/shell
- launch_cap_2024: 50% reduction in annual launch rate
- hybrid_2024: Combined ADR (30/yr/shell) + 25% launch cap + 35% AI traffic management improvement

---
Provide a policy recommendation covering:
1. Your #1 recommended strategy with clear rationale (cite specific scores and metrics)
2. Trade-offs: what does the winning strategy sacrifice?
3. One sentence on why the baseline is unacceptable
4. If applicable, when ADR alone is preferred vs hybrid

Be decisive. Decision makers need clear guidance.
---
Orbital Sustainability Analyst:"""


def build_sustainability_analysis_prompt(metrics: dict, baseline_metrics: dict = None) -> str:
    """
    Build prompt for sustainability analysis
    
    Args:
        metrics: Dictionary containing scenario metrics
        baseline_metrics: Optional baseline metrics for comparison
        
    Returns:
        Formatted prompt string
    """
    comparison_block = ""
    if baseline_metrics:
        comparison_block = f"""
COMPARISON VS BASELINE:
- Collision reduction: {metrics.get('collision_reduction_pct', 0):.1f}%
- Debris reduction at year 30: {metrics.get('debris_reduction_pct', 0):.1f}%
"""
    
    return f"""{SYSTEM_PERSONA}

---
TASK: Sustainability Analysis

Scenario: {metrics.get('scenario_id', 'Unknown')}

FULL METRICS:
- Collision Frequency (avg, final decade): {metrics.get('collision_frequency', 'N/A')}/yr
- Debris Growth (30yr): {metrics.get('debris_growth_pct', 'N/A')}%
- Survivability: {metrics.get('survivability_pct', 'N/A')}%
- Congestion Index (final): {metrics.get('congestion_index', 'N/A')}
- Sustainability Score: {metrics.get('score', 'N/A')}/100
{comparison_block}

---
Provide a deep sustainability analysis covering:
1. Trajectory: Is this scenario moving toward or away from orbital sustainability over 30 years?
2. Critical thresholds: Will any shells cross Kessler cascade risk thresholds?
3. Survivability implications: What does this mean for commercial satellite operators?
4. Long-term prognosis: What happens at year 50 if this policy is sustained?
5. One key insight that surprised you in this data

Use precise technical language but remain accessible to a non-specialist reader.
---
Orbital Sustainability Analyst:"""


def build_executive_summary_prompt(metrics: dict, scenario_name: str) -> str:
    """
    Build prompt for executive summary
    
    Args:
        metrics: Dictionary containing scenario metrics
        scenario_name: Name of the scenario
        
    Returns:
        Formatted prompt string
    """
    return f"""{SYSTEM_PERSONA}

---
TASK: Executive Summary

You are preparing a briefing for the space agency director / policy chief for scenario: {scenario_name}

KEY METRICS:
- Sustainability Score: {metrics.get('score', 'N/A')}/100 (Grade: {metrics.get('grade', 'N/A')})
- Collision Frequency: {metrics.get('collision_frequency', 'N/A')}/year
- 30-Year Debris Change: {metrics.get('debris_growth_pct', 'N/A')}%
- Satellite Survivability: {metrics.get('survivability_pct', 'N/A')}%
- Collision Reduction vs Baseline: {metrics.get('collision_reduction_pct', 0):.1f}%

---
Write a 3-paragraph executive summary:

Paragraph 1 — Situation: What is the current orbital environment and what does this scenario address?
Paragraph 2 — Findings: What did the simulation show? Lead with the most important number.
Paragraph 3 — Recommendation: One clear action for leadership. What should they do next?

Do not use bullet points. Write in polished prose suitable for a briefing document.
Target audience: Senior policy official with no technical background.
---
Orbital Sustainability Analyst:"""


def _format_shell_breakdown(shells: list) -> str:
    """
    Format shell breakdown data for prompt
    
    Args:
        shells: List of shell statistics dictionaries
        
    Returns:
        Formatted string
    """
    if not shells:
        return "  No shell data available"
    
    # Sort by debris change percentage (worst first)
    worst = sorted(shells, key=lambda s: s.get("debris_change_pct", 0), reverse=True)[:3]
    
    return "\n".join([
        f"  • {s.get('shell_label', 'Unknown')}: {s.get('debris_change_pct', 0):+.1f}% debris change, "
        f"{s.get('total_collisions', 0):.1f} total collisions"
        for s in worst
    ])


# Prompt validation helpers
def validate_metrics(metrics: dict) -> bool:
    """
    Validate that metrics dictionary contains required fields
    
    Args:
        metrics: Metrics dictionary to validate
        
    Returns:
        True if valid
    """
    required_fields = ['scenario_id', 'collision_frequency', 'debris_growth_pct', 
                      'survivability_pct', 'congestion_index']
    return all(field in metrics for field in required_fields)


def validate_comparison(comparison: dict) -> bool:
    """
    Validate that comparison dictionary contains required fields
    
    Args:
        comparison: Comparison dictionary to validate
        
    Returns:
        True if valid
    """
    required_fields = ['ranked', 'scores', 'winner']
    return all(field in comparison for field in required_fields)


if __name__ == "__main__":
    """Test prompt generation"""
    print("=" * 80)
    print("PROMPT TEMPLATE TEST")
    print("=" * 80)
    
    # Test metrics
    test_metrics = {
        'scenario_id': 'hybrid_2024',
        'collision_frequency': 12.5,
        'debris_growth_pct': 15.3,
        'survivability_pct': 87.2,
        'congestion_index': 95,
        'score': 78,
        'grade': 'B',
        'shell_breakdown': [
            {'shell_label': 'LEO-2 (600-800km)', 'debris_change_pct': 18.5, 'total_collisions': 45},
            {'shell_label': 'LEO-1 (400-600km)', 'debris_change_pct': 12.3, 'total_collisions': 32}
        ]
    }
    
    print("\n1. Risk Assessment Prompt:")
    print("-" * 80)
    prompt = build_risk_assessment_prompt(test_metrics)
    print(prompt[:500] + "...")
    
    print("\n2. Executive Summary Prompt:")
    print("-" * 80)
    prompt = build_executive_summary_prompt(test_metrics, "Hybrid Intervention 2024")
    print(prompt[:500] + "...")
    
    print("\n✓ Prompt templates generated successfully")
    print("=" * 80)

# Made with Bob
