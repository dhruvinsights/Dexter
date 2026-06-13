# Workstream 5 — AI Sustainability Analyst Agent

**Owner:** Person E  
**Estimated effort:** 6–8 hours  
**Parallel with:** WS6 (Frontend), WS7 (Reports)  
**Depends on:** WS4 API contract (get endpoint map Day 1), WS3 metric schemas  
**Outputs consumed by:** WS6 (frontend AI panel), WS7 (report content)

---

## Goal

Build the **Orbital Sustainability Analyst** — an LLM-based agentic service that ingests simulation metrics and generates human-readable risk assessments, policy recommendations, comparative analyses, and executive summaries.

This is the "unique innovation" of Orbital Sentinel. It should feel like a smart analyst that actually understands orbital mechanics, not a generic chatbot.

---

## Primary AI Provider: IBM watsonx

Since this is at IBM, use **IBM Granite-13b-instruct** via watsonx.ai. This is also the strongest story for the hackathon judges.

Fallback: OpenAI GPT-4o-mini (for local dev if watsonx access is delayed).

---

## The Four Agent Capabilities

| Capability | Trigger | Output |
|---|---|---|
| **Risk Assessment** | Single scenario metrics | Risk level + explanation of what's driving it |
| **Policy Recommendation** | Comparison result | Ranked recommendation with rationale |
| **Sustainability Analysis** | Single scenario metrics | Deep-dive narrative on long-term trajectory |
| **Executive Summary** | Any scenario | Boardroom-ready 3-paragraph summary |

---

## What You Need to Build

### 5.1 LLM Client (watsonx + OpenAI fallback)

**File:** `backend/app/ai/llm_client.py`

```python
# backend/app/ai/llm_client.py

from app.config import settings
import logging

logger = logging.getLogger(__name__)

class LLMClient:
    """
    Unified LLM client that tries watsonx first, falls back to OpenAI.
    """

    def __init__(self):
        self._wx_client = None
        self._oai_client = None
        self._init_clients()

    def _init_clients(self):
        # Try IBM watsonx
        if settings.IBM_WATSONX_API_KEY:
            try:
                from ibm_watsonx_ai import APIClient, Credentials
                from ibm_watsonx_ai.foundation_models import ModelInference
                from ibm_watsonx_ai.metanames import GenTextParamsMetaNames

                credentials = Credentials(
                    url=settings.IBM_WATSONX_URL,
                    api_key=settings.IBM_WATSONX_API_KEY,
                )
                self._wx_client = ModelInference(
                    model_id="ibm/granite-13b-instruct-v2",
                    credentials=credentials,
                    project_id=settings.IBM_WATSONX_PROJECT_ID,
                    params={
                        GenTextParamsMetaNames.MAX_NEW_TOKENS: 1024,
                        GenTextParamsMetaNames.TEMPERATURE: 0.3,
                        GenTextParamsMetaNames.TOP_P: 0.9,
                        GenTextParamsMetaNames.STOP_SEQUENCES: ["Human:", "---"],
                    }
                )
                logger.info("✅ IBM watsonx client initialized (Granite-13b-instruct-v2)")
            except Exception as e:
                logger.warning(f"watsonx init failed: {e} — will use OpenAI fallback")

        # OpenAI fallback
        if settings.OPENAI_API_KEY and not self._wx_client:
            from openai import AsyncOpenAI
            self._oai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info("✅ OpenAI client initialized (GPT-4o-mini fallback)")

    async def generate(self, prompt: str) -> str:
        """Generate a response. Tries watsonx, falls back to OpenAI."""
        if self._wx_client:
            try:
                result = self._wx_client.generate_text(prompt=prompt)
                return result
            except Exception as e:
                logger.error(f"watsonx generation error: {e}")

        if self._oai_client:
            response = await self._oai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1024,
                temperature=0.3,
            )
            return response.choices[0].message.content

        raise RuntimeError("No AI provider available. Check API keys in .env")

    async def stream(self, prompt: str):
        """Stream tokens. Used for the real-time frontend display."""
        if self._oai_client:
            async for chunk in await self._oai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                stream=True,
                temperature=0.3,
            ):
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
            return

        # watsonx doesn't stream easily — simulate with generate + chunking
        full = await self.generate(prompt)
        words = full.split()
        for i in range(0, len(words), 5):
            yield " ".join(words[i:i+5]) + " "
            import asyncio; await asyncio.sleep(0.05)


# Singleton — import this everywhere
llm = LLMClient()
```

---

### 5.2 Prompt Templates

**File:** `backend/app/ai/prompts.py`

These are carefully engineered prompts that produce expert-level orbital analysis. The system persona is critical — it frames all outputs correctly.

```python
# backend/app/ai/prompts.py

SYSTEM_PERSONA = """You are the Orbital Sustainability Analyst for Orbital Sentinel, 
an AI-powered orbital sustainability decision support platform.

You are a world-class expert in orbital mechanics, space debris mitigation, 
and international space policy. You have deep knowledge of:
- MIT MOCAT (Monte Carlo Object Collision Assessment) methodology
- ESA Space Debris Mitigation Guidelines
- Inter-Agency Space Debris Coordination Committee (IADC) standards
- Active Debris Removal economics and engineering
- Kessler Syndrome dynamics

Your tone is: authoritative, precise, and clear. You translate technical 
simulation metrics into actionable insights for both engineers and executives.
You never hedge unnecessarily — you state conclusions clearly with evidence.

Always cite specific metric values in your responses.
Keep responses concise and structured (under 300 words unless a full report)."""


def build_risk_assessment_prompt(metrics: dict) -> str:
    return f"""{SYSTEM_PERSONA}

---
TASK: Risk Assessment

You are given orbital simulation metrics for the scenario: {metrics['scenario_id']}

METRICS:
- Collision Frequency: {metrics['collision_frequency']} events/year (30-year avg)
- Debris Growth: {metrics['debris_growth_pct']}% over simulation period
- Survivability Index: {metrics['survivability_pct']}%
- Congestion Index: {metrics['congestion_index']} (100 = current baseline)
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
    ranked = comparison.get("ranked", [])
    scores = comparison.get("scores", {})
    winner = comparison.get("winner", "")

    scenario_summaries = "\n".join([
        f"- {sid}: Score {scores[sid]['total_score']}/100 (Grade {scores[sid]['grade']}) "
        f"| Collision reduction: {comparison['metrics'][sid].get('collision_reduction_pct', 0):.1f}%"
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


def build_sustainability_analysis_prompt(metrics: dict, baseline_metrics: dict | None = None) -> str:
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

Scenario: {metrics['scenario_id']}

FULL METRICS:
- Collision Frequency (avg, final decade): {metrics['collision_frequency']}/yr
- Debris Growth (30yr): {metrics['debris_growth_pct']}%
- Survivability: {metrics['survivability_pct']}%
- Congestion Index (final): {metrics['congestion_index']}
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
    return f"""{SYSTEM_PERSONA}

---
TASK: Executive Summary

You are preparing a briefing for the space agency director / policy chief for scenario: {scenario_name}

KEY METRICS:
- Sustainability Score: {metrics.get('score', 'N/A')}/100 (Grade: {metrics.get('grade', 'N/A')})
- Collision Frequency: {metrics['collision_frequency']}/year
- 30-Year Debris Change: {metrics['debris_growth_pct']}%
- Satellite Survivability: {metrics['survivability_pct']}%
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
    if not shells:
        return "  No shell data available"
    worst = sorted(shells, key=lambda s: s.get("debris_change_pct", 0), reverse=True)[:3]
    return "\n".join([
        f"  • {s['shell_label']}: {s['debris_change_pct']:+.1f}% debris change, "
        f"{s['total_collisions']:.1f} total collisions"
        for s in worst
    ])
```

---

### 5.3 Analysis Service

**File:** `backend/app/ai/analyst.py`

```python
# backend/app/ai/analyst.py

from app.ai.llm_client import llm
from app.ai.prompts import (
    build_risk_assessment_prompt,
    build_recommendation_prompt,
    build_sustainability_analysis_prompt,
    build_executive_summary_prompt,
)
from app.models.ai import (
    AnalysisRequest, AnalysisResponse, AnalysisType
)
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

async def run_analysis(request: AnalysisRequest) -> AnalysisResponse:
    """Route to the appropriate analysis prompt and return response."""
    start = datetime.utcnow()

    if request.analysis_type == AnalysisType.RISK_ASSESSMENT:
        prompt = build_risk_assessment_prompt(request.metrics)

    elif request.analysis_type == AnalysisType.RECOMMENDATION:
        if not request.comparison:
            raise ValueError("comparison data required for RECOMMENDATION analysis")
        prompt = build_recommendation_prompt(request.comparison)

    elif request.analysis_type == AnalysisType.SUSTAINABILITY_ANALYSIS:
        prompt = build_sustainability_analysis_prompt(
            request.metrics,
            request.baseline_metrics
        )

    elif request.analysis_type == AnalysisType.EXECUTIVE_SUMMARY:
        prompt = build_executive_summary_prompt(
            request.metrics,
            request.scenario_name or request.metrics.get("scenario_id", "Unknown")
        )

    else:
        raise ValueError(f"Unknown analysis type: {request.analysis_type}")

    text = await llm.generate(prompt)
    elapsed = (datetime.utcnow() - start).total_seconds()

    logger.info(f"AI analysis [{request.analysis_type}] completed in {elapsed:.1f}s")

    return AnalysisResponse(
        analysis_type=request.analysis_type,
        scenario_id=request.metrics.get("scenario_id"),
        content=text.strip(),
        model_used="granite-13b-instruct-v2" if llm._wx_client else "gpt-4o-mini",
        generated_at=datetime.utcnow().isoformat(),
        latency_seconds=round(elapsed, 2),
    )
```

---

### 5.4 Data Models

**File:** `backend/app/models/ai.py`

```python
# backend/app/models/ai.py

from pydantic import BaseModel
from typing import Optional, Any
from enum import Enum

class AnalysisType(str, Enum):
    RISK_ASSESSMENT         = "risk_assessment"
    RECOMMENDATION          = "recommendation"
    SUSTAINABILITY_ANALYSIS = "sustainability_analysis"
    EXECUTIVE_SUMMARY       = "executive_summary"

class AnalysisRequest(BaseModel):
    analysis_type: AnalysisType
    metrics: dict[str, Any]              # ScenarioMetrics as dict
    comparison: Optional[dict] = None   # ComparisonResult as dict (for recommendations)
    baseline_metrics: Optional[dict] = None
    scenario_name: Optional[str] = None

class AnalysisResponse(BaseModel):
    analysis_type: AnalysisType
    scenario_id: Optional[str]
    content: str
    model_used: str
    generated_at: str
    latency_seconds: float
```

---

### 5.5 API Endpoints

**File:** `backend/app/routers/ai.py`

```python
# backend/app/routers/ai.py

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.ai.analyst import run_analysis
from app.ai.llm_client import llm
from app.ai.prompts import build_executive_summary_prompt
from app.models.ai import AnalysisRequest, AnalysisResponse, AnalysisType
from app.simulation.precomputed import load_precomputed, DEMO_SCENARIOS
from app.metrics.extractor import extract_metrics
from app.metrics.scoring import compute_sustainability_score
from app.metrics.comparator import COST_ESTIMATES
import json

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalysisRequest):
    """Run any analysis type. Returns full text response."""
    return await run_analysis(request)

@router.get("/stream/{scenario_id}")
async def stream_analysis(scenario_id: str, analysis_type: str = "risk_assessment"):
    """
    SSE endpoint — streams AI tokens in real time.
    Used by the frontend AI Analyst panel for the typewriter effect.
    """
    output = load_precomputed(scenario_id)
    baseline = load_precomputed("baseline_2024")
    if not output:
        return {"error": "Scenario not found"}

    m = extract_metrics(output, baseline)
    config = next((s for s in DEMO_SCENARIOS if s.scenario_id == scenario_id), None)
    cost_score = COST_ESTIMATES.get(config.intervention.value if config else "baseline", 50.0)
    score = compute_sustainability_score(m, cost_score)

    metrics_dict = m.model_dump()
    metrics_dict["score"] = score.total_score
    metrics_dict["grade"] = score.grade

    from app.ai.prompts import (
        build_risk_assessment_prompt, build_executive_summary_prompt
    )
    prompt = build_risk_assessment_prompt(metrics_dict)

    async def generate():
        async for token in llm.stream(prompt):
            yield f"data: {json.dumps({'token': token})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@router.get("/quick-summary/{scenario_id}")
async def quick_summary(scenario_id: str):
    """
    One-shot: fetch metrics, run executive summary, return it.
    Used by the Dashboard AI Summary Panel.
    """
    output = load_precomputed(scenario_id)
    baseline = load_precomputed("baseline_2024")
    if not output:
        return {"error": "Scenario not found"}

    m = extract_metrics(output, baseline)
    config = next((s for s in DEMO_SCENARIOS if s.scenario_id == scenario_id), None)
    cost_score = COST_ESTIMATES.get(config.intervention.value if config else "baseline", 50.0)
    score = compute_sustainability_score(m, cost_score)

    metrics_dict = m.model_dump()
    metrics_dict["score"] = score.total_score
    metrics_dict["grade"] = score.grade

    request = AnalysisRequest(
        analysis_type=AnalysisType.EXECUTIVE_SUMMARY,
        metrics=metrics_dict,
        scenario_name=config.name if config else scenario_id,
    )
    return await run_analysis(request)
```

---

## Definition of Done

- [ ] `POST /api/ai/analyze` returns valid text for all 4 analysis types
- [ ] `GET /api/ai/stream/{id}` streams tokens as SSE events
- [ ] `GET /api/ai/quick-summary/{id}` works end-to-end
- [ ] watsonx client initializes correctly if API key is provided
- [ ] OpenAI fallback works without watsonx keys
- [ ] Responses contain specific metric values (not generic text)
- [ ] Risk assessment correctly labels Hybrid as lower risk than Baseline
- [ ] Executive summary is 3 paragraphs, no bullet points
