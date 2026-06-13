# Orbital Sentinel AI Agent Implementation Plan

## Overview
This document outlines the implementation plan for the Orbital Sentinel AI Agent system with CelesTrak data ingestion, Db2 storage, Ollama embeddings, and four specialized AI agents.

---

## Phase 1: Data Ingestion & Storage (Steps 1-4)

### 1.1 Configurable CelesTrak Data Fetching Script

**File:** `scripts/fetch_celestrak_data.py`

**Features:**
- Environment variable configuration for:
  - Data sources (active, debris groups, starlink, etc.)
  - Fetch limits (sample size, rate limiting)
  - Output paths
- Support for multiple debris groups:
  - `iridium-33-debris`
  - `cosmos-2251-debris`
  - `fengyun-1c-debris`
- Configurable enrichment (orbital shell, altitude, object type)
- JSON output with timestamp

**Configuration Variables:**
```python
CELESTRAK_GROUPS = ["active", "starlink", "iridium-33-debris", "cosmos-2251-debris", "fengyun-1c-debris"]
DEBRIS_SAMPLE_LIMIT = 100
RATE_LIMIT_DELAY = 0.5
OUTPUT_FILE = "celestrak_data.json"
```

---

### 1.2 Environment Configuration

**File:** `.env`

```env
# Db2 Database Configuration
DB2_HOST=your-db2-host.ibm.com
DB2_USERNAME=your_username
DB2_PASSWORD="your_password"
DB2_DATABASE=ORBITAL
DB2_PORT=50000

# CelesTrak Configuration
CELESTRAK_GROUPS=active,starlink,iridium-33-debris,cosmos-2251-debris,fengyun-1c-debris
DEBRIS_SAMPLE_LIMIT=100
RATE_LIMIT_DELAY=0.5

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=granite-code:8b
OLLAMA_EMBEDDING_MODEL=granite-embedding

# AI Agent Configuration
AI_PROVIDER=ollama
AI_TEMPERATURE=0.3
AI_MAX_TOKENS=1024
```

**File:** `.env.example` (template for users)

---

### 1.3 Db2 Connection & Schema Setup

**File:** `config/db2_connection.py`

**Features:**
- Connection pooling
- Retry logic with exponential backoff
- Health check endpoint
- Transaction management

**File:** `config/db2_schema_enhanced.sql`

**Tables:**
1. `satellite_catalog` - Master catalog of all space objects
2. `orbital_elements` - Time-series orbital parameters
3. `debris_events` - Collision/fragmentation events
4. `orbital_shell_stats` - Aggregated statistics per shell
5. `ai_analysis_cache` - Cache AI-generated analyses

---

### 1.4 Data Loading Pipeline

**File:** `ingestion/load_to_db2_enhanced.py`

**Features:**
- Batch insert optimization
- Duplicate detection (by NORAD_CAT_ID + EPOCH)
- Data validation
- Progress tracking
- Error handling and rollback

---

## Phase 2: Ollama Embeddings Setup (Step 3)

### 2.1 Ollama Integration

**File:** `ai/embeddings/ollama_client.py`

**Features:**
- Connect to local Ollama instance
- Use Granite embedding model
- Batch embedding generation
- Vector storage in Db2 (VECTOR column type)

**File:** `ai/embeddings/document_processor.py`

**Features:**
- Process policy documents (PDF, DOCX, TXT)
- Chunk text into semantic segments
- Generate embeddings for each chunk
- Store in `policy_documents` and `document_embeddings` tables

**Tables:**
```sql
CREATE TABLE policy_documents (
    doc_id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(500),
    source VARCHAR(200),
    content CLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_embeddings (
    embedding_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc_id VARCHAR(50) REFERENCES policy_documents(doc_id),
    chunk_text CLOB,
    embedding VECTOR(768),  -- Granite embedding dimension
    chunk_index INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Phase 3: AI Agent Implementation (Step 4)

### 3.1 Directory Structure

```
ai/
├── __init__.py
├── llm_client.py              # Ollama LLM client
├── prompts.py                 # Prompt templates
├── analyst.py                 # Main analysis orchestrator
├── embeddings/
│   ├── __init__.py
│   ├── ollama_client.py       # Embedding generation
│   └── document_processor.py  # Document chunking & embedding
├── agents/
│   ├── __init__.py
│   ├── risk_assessor.py       # Risk Assessment Agent
│   ├── policy_recommender.py  # Policy Recommendation Agent
│   ├── sustainability_analyst.py  # Sustainability Analysis Agent
│   └── executive_summarizer.py    # Executive Summary Agent
└── models/
    ├── __init__.py
    ├── ai_models.py           # Pydantic models
    └── metrics_models.py      # Metrics data models
```

---

### 3.2 LLM Client (Ollama + Granite)

**File:** `ai/llm_client.py`

**Features:**
- Connect to Ollama API
- Use Granite model (granite-code:8b or granite-embedding)
- Streaming support for real-time responses
- Fallback error handling
- Token counting and cost tracking

**Key Methods:**
```python
class OllamaLLMClient:
    async def generate(prompt: str) -> str
    async def stream(prompt: str) -> AsyncGenerator[str]
    async def embed(text: str) -> List[float]
    async def health_check() -> bool
```

---

### 3.3 Four Agent Capabilities

#### Agent 1: Risk Assessment Agent
**File:** `ai/agents/risk_assessor.py`

**Input:** Single scenario metrics
**Output:** Risk level + explanation

**Capabilities:**
- Analyze collision frequency trends
- Identify high-risk orbital shells
- Calculate Kessler syndrome probability
- Provide 10-year and 30-year projections

---

#### Agent 2: Policy Recommendation Agent
**File:** `ai/agents/policy_recommender.py`

**Input:** Comparison results from multiple scenarios
**Output:** Ranked recommendations with rationale

**Capabilities:**
- Compare intervention strategies
- Cost-benefit analysis
- Trade-off identification
- Actionable policy suggestions

---

#### Agent 3: Sustainability Analysis Agent
**File:** `ai/agents/sustainability_analyst.py`

**Input:** Single scenario metrics + baseline comparison
**Output:** Deep-dive narrative on long-term trajectory

**Capabilities:**
- Long-term sustainability trajectory analysis
- Critical threshold detection
- Survivability implications for operators
- 50-year prognosis

---

#### Agent 4: Executive Summary Agent
**File:** `ai/agents/executive_summarizer.py`

**Input:** Any scenario metrics
**Output:** 3-paragraph boardroom-ready summary

**Capabilities:**
- Situation overview
- Key findings (lead with most important metric)
- Clear recommendation for leadership

---

### 3.4 Prompt Engineering

**File:** `ai/prompts.py`

**System Persona:**
```
You are the Orbital Sustainability Analyst for Orbital Sentinel.
Expert in: orbital mechanics, space debris mitigation, IADC standards, 
Kessler Syndrome dynamics, ADR economics.
Tone: authoritative, precise, clear.
Always cite specific metric values.
```

**Prompt Templates:**
- `build_risk_assessment_prompt(metrics: dict) -> str`
- `build_recommendation_prompt(comparison: dict) -> str`
- `build_sustainability_analysis_prompt(metrics: dict, baseline: dict) -> str`
- `build_executive_summary_prompt(metrics: dict, scenario_name: str) -> str`

---

### 3.5 Analysis Service

**File:** `ai/analyst.py`

**Main Function:**
```python
async def run_analysis(request: AnalysisRequest) -> AnalysisResponse:
    """Route to appropriate agent and return response"""
```

**Features:**
- Route requests to correct agent
- Metrics preprocessing
- Response formatting
- Latency tracking
- Error handling

---

### 3.6 Data Models

**File:** `ai/models/ai_models.py`

```python
class AnalysisType(str, Enum):
    RISK_ASSESSMENT = "risk_assessment"
    RECOMMENDATION = "recommendation"
    SUSTAINABILITY_ANALYSIS = "sustainability_analysis"
    EXECUTIVE_SUMMARY = "executive_summary"

class AnalysisRequest(BaseModel):
    analysis_type: AnalysisType
    metrics: dict[str, Any]
    comparison: Optional[dict] = None
    baseline_metrics: Optional[dict] = None
    scenario_name: Optional[str] = None

class AnalysisResponse(BaseModel):
    analysis_type: AnalysisType
    scenario_id: Optional[str]
    content: str
    model_used: str
    generated_at: str
    latency_seconds: float
    confidence_score: Optional[float] = None
```

---

### 3.7 API Endpoints

**File:** `api/routers/ai.py`

**Endpoints:**

1. `POST /api/ai/analyze` - Run any analysis type
2. `GET /api/ai/stream/{scenario_id}` - Stream AI tokens (SSE)
3. `GET /api/ai/quick-summary/{scenario_id}` - One-shot executive summary
4. `POST /api/ai/compare` - Compare multiple scenarios
5. `GET /api/ai/health` - Health check

---

## Phase 4: Testing & Deployment (Steps 13-14)

### 4.1 Testing Strategy

**Unit Tests:**
- `tests/test_celestrak_fetch.py`
- `tests/test_db2_connection.py`
- `tests/test_ollama_client.py`
- `tests/test_agents.py`

**Integration Tests:**
- End-to-end data pipeline
- AI agent response quality
- API endpoint functionality

**Test Data:**
- Sample CelesTrak data (100 debris objects)
- Mock metrics for all 4 scenarios
- Baseline comparison data

---

### 4.2 Git Workflow

**Branch:** `agentic_orbital_pred`

**Commit Structure:**
1. `feat: add configurable CelesTrak fetching script`
2. `feat: add Db2 connection and schema`
3. `feat: add Ollama embeddings integration`
4. `feat: implement AI agent infrastructure`
5. `feat: add risk assessment agent`
6. `feat: add policy recommendation agent`
7. `feat: add sustainability analysis agent`
8. `feat: add executive summary agent`
9. `feat: add API endpoints for AI agents`
10. `test: add comprehensive test suite`
11. `docs: update README with setup instructions`

---

## Implementation Timeline

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1 | Data Ingestion & Db2 Setup | 2-3 hours |
| Phase 2 | Ollama Embeddings | 1-2 hours |
| Phase 3 | AI Agents | 4-5 hours |
| Phase 4 | Testing & Deployment | 1-2 hours |
| **Total** | | **8-12 hours** |

---

## Success Criteria

- [ ] CelesTrak data successfully fetched and stored in Db2
- [ ] Ollama embeddings generated for policy documents
- [ ] All 4 AI agents produce coherent, metric-driven responses
- [ ] API endpoints return valid responses within 3 seconds
- [ ] Risk assessment correctly identifies high-risk scenarios
- [ ] Policy recommendations are actionable and specific
- [ ] Executive summaries are 3 paragraphs, no bullet points
- [ ] Code pushed to `agentic_orbital_pred` branch
- [ ] README updated with setup instructions

---

## Next Steps

1. Review and approve this plan
2. Begin Phase 1: Create configurable fetch script
3. Set up .env file with Db2 credentials
4. Implement Db2 connection and schema
5. Continue through phases sequentially
