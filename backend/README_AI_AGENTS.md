# Orbital Sentinel AI Agents - Setup & Usage Guide

## Overview

This implementation provides a complete AI-powered analysis system for orbital sustainability using Ollama with Granite models. The system includes:

- **4 Specialized AI Agents**: Risk Assessment, Policy Recommendation, Sustainability Analysis, Executive Summary
- **Ollama Integration**: Local LLM and embedding generation with Granite models
- **Db2 Database**: Complete schema for satellite tracking and AI analysis caching
- **FastAPI Endpoints**: RESTful API with streaming support
- **Document Processing**: RAG-ready embedding pipeline for policy documents

---

## Prerequisites

### 1. System Requirements
- Python 3.9+
- Db2 Database (accessible instance)
- Ollama (running locally or remotely)
- 8GB+ RAM recommended

### 2. Required Services

#### Ollama Setup
```bash
# Install Ollama (macOS/Linux)
curl https://ollama.ai/install.sh | sh

# Pull required models
ollama pull granite-code:8b
ollama pull granite-embedding

# Verify Ollama is running
curl http://localhost:11434/api/tags
```

#### Db2 Database
- Ensure Db2 is running and accessible
- Have connection credentials ready (host, username, password, database)

---

## Installation

### 1. Clone Repository
```bash
cd orbital-sentinel-ai
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

**Required Configuration**:
```env
# Db2 Database
DB2_HOST=your-db2-host.ibm.com
DB2_USERNAME=your_username
DB2_PASSWORD="your_password"
DB2_DATABASE=ORBITAL
DB2_PORT=50000

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=granite-code:8b
OLLAMA_EMBEDDING_MODEL=granite-embedding

# AI Configuration
AI_TEMPERATURE=0.3
AI_MAX_TOKENS=1024
```

### 4. Set Up Database Schema
```bash
# Create all tables, views, and procedures
python config/setup_db2_schema.py

# Or drop existing and recreate
python config/setup_db2_schema.py --drop
```

### 5. Verify Installation
```bash
# Test Db2 connection
python config/db2_connection.py

# Test Ollama LLM
python ai/llm_client.py

# Test Ollama embeddings
python ai/embeddings/ollama_client.py
```

---

## Usage

### 1. Fetch CelesTrak Data
```bash
# Fetch satellite and debris data
python scripts/fetch_celestrak_data.py

# Output: celestrak_data.json
```

### 2. Run AI Analysis (Python)
```python
import asyncio
from ai.analyst import run_analysis
from ai.models.ai_models import AnalysisRequest, AnalysisType

# Prepare metrics
metrics = {
    'scenario_id': 'hybrid_2024',
    'collision_frequency': 12.5,
    'debris_growth_pct': 15.3,
    'survivability_pct': 87.2,
    'congestion_index': 95,
    'score': 78,
    'grade': 'B'
}

# Create request
request = AnalysisRequest(
    analysis_type=AnalysisType.RISK_ASSESSMENT,
    metrics=metrics,
    scenario_name="Hybrid Intervention 2024"
)

# Run analysis
response = asyncio.run(run_analysis(request))
print(response.content)
```

### 3. Start API Server
```bash
# Create main FastAPI app (if not exists)
# Then run:
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. API Endpoints

#### Analyze Scenario
```bash
curl -X POST http://localhost:8000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "analysis_type": "risk_assessment",
    "metrics": {
      "scenario_id": "hybrid_2024",
      "collision_frequency": 12.5,
      "debris_growth_pct": 15.3,
      "survivability_pct": 87.2,
      "congestion_index": 95,
      "score": 78,
      "grade": "B"
    },
    "scenario_name": "Hybrid Intervention 2024"
  }'
```

#### Stream Analysis (SSE)
```bash
curl -N http://localhost:8000/api/ai/stream/hybrid_2024?analysis_type=risk_assessment
```

#### Quick Executive Summary
```bash
curl http://localhost:8000/api/ai/quick-summary/hybrid_2024
```

#### Health Check
```bash
curl http://localhost:8000/api/ai/health
```

---

## AI Agent Capabilities

### 1. Risk Assessment Agent
**Purpose**: Analyze collision risks and identify high-risk orbital shells

**Input**: Scenario metrics
**Output**: 
- Overall risk level (Critical/High/Moderate/Low)
- High-risk orbital shells
- 10-year and 30-year trajectory
- Key warnings for decision makers

**Example**:
```python
request = AnalysisRequest(
    analysis_type=AnalysisType.RISK_ASSESSMENT,
    metrics=metrics
)
```

### 2. Policy Recommendation Agent
**Purpose**: Compare intervention strategies and recommend best approach

**Input**: Comparison data with multiple scenarios
**Output**:
- #1 recommended strategy with rationale
- Trade-offs analysis
- Why baseline is unacceptable
- When to prefer ADR vs hybrid

**Example**:
```python
comparison = {
    "ranked": ["hybrid_2024", "adr_aggressive_2024", "launch_cap_2024", "baseline_2024"],
    "winner": "hybrid_2024",
    "scores": {
        "hybrid_2024": {"total_score": 78, "grade": "B"},
        "adr_aggressive_2024": {"total_score": 72, "grade": "C"}
    },
    "metrics": {
        "hybrid_2024": {"collision_reduction_pct": 35.2}
    }
}

request = AnalysisRequest(
    analysis_type=AnalysisType.RECOMMENDATION,
    metrics={},
    comparison=comparison
)
```

### 3. Sustainability Analysis Agent
**Purpose**: Deep-dive into long-term orbital sustainability trajectory

**Input**: Scenario metrics + optional baseline comparison
**Output**:
- 30-year sustainability trajectory
- Critical threshold analysis
- Survivability implications
- 50-year prognosis
- Key insights

**Example**:
```python
request = AnalysisRequest(
    analysis_type=AnalysisType.SUSTAINABILITY_ANALYSIS,
    metrics=metrics,
    baseline_metrics=baseline_metrics
)
```

### 4. Executive Summary Agent
**Purpose**: Generate boardroom-ready 3-paragraph summary

**Input**: Scenario metrics
**Output**: 3 paragraphs:
1. Situation overview
2. Key findings (lead with most important metric)
3. Clear recommendation for leadership

**Example**:
```python
request = AnalysisRequest(
    analysis_type=AnalysisType.EXECUTIVE_SUMMARY,
    metrics=metrics,
    scenario_name="Hybrid Intervention 2024"
)
```

---

## Document Processing (RAG)

### Process Policy Documents
```python
from ai.embeddings.document_processor import DocumentProcessor

processor = DocumentProcessor(chunk_size=500, chunk_overlap=50)

# Process a PDF document
doc_id, chunks = processor.process_document(
    filepath='path/to/policy.pdf',
    title='ESA Space Debris Mitigation Guidelines',
    source='ESA',
    document_type='policy'
)

print(f"Processed {chunks} chunks for document {doc_id}")
```

---

## Database Schema

### Key Tables

1. **satellite_catalog** - Master catalog of space objects
2. **orbital_elements** - Time-series orbital parameters
3. **debris_events** - Collision/fragmentation events
4. **orbital_shell_stats** - Aggregated statistics per shell
5. **ai_analysis_cache** - Cache AI-generated analyses
6. **policy_documents** - Policy document storage
7. **document_embeddings** - Vector embeddings for RAG
8. **simulation_scenarios** - Simulation configurations
9. **scenario_metrics** - Computed metrics

### Useful Views

- `v_latest_orbital_elements` - Latest elements per satellite
- `v_debris_by_event` - Debris statistics by event
- `v_current_shell_summary` - Current shell summary

---

## Troubleshooting

### Ollama Connection Issues
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
ollama serve

# Check model availability
ollama list
```

### Db2 Connection Issues
```bash
# Test connection
python config/db2_connection.py

# Check credentials in .env
cat .env | grep DB2
```

### Model Not Found
```bash
# Pull missing models
ollama pull granite-code:8b
ollama pull granite-embedding

# Verify models
ollama list
```

### Import Errors
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Check Python version
python --version  # Should be 3.9+
```

---

## File Structure

```
orbital-sentinel-ai/
├── .env                              # Environment configuration
├── .env.example                      # Environment template
├── requirements.txt                  # Python dependencies
├── IMPLEMENTATION_PLAN.md            # Detailed implementation plan
├── README_AI_AGENTS.md               # This file
│
├── config/
│   ├── db2_connection.py             # Db2 connection manager
│   ├── db2_schema_enhanced.sql       # Database schema
│   └── setup_db2_schema.py           # Schema setup script
│
├── scripts/
│   └── fetch_celestrak_data.py       # Configurable data fetcher
│
├── ingestion/
│   ├── ingest_celestrak.py           # CelesTrak ingester
│   └── load_to_db2.py                # Db2 loader
│
├── ai/
│   ├── __init__.py
│   ├── llm_client.py                 # Ollama LLM client
│   ├── prompts.py                    # Prompt templates
│   ├── analyst.py                    # Analysis orchestrator
│   │
│   ├── embeddings/
│   │   ├── ollama_client.py          # Embedding client
│   │   └── document_processor.py     # Document processor
│   │
│   └── models/
│       └── ai_models.py              # Pydantic models
│
└── api/
    └── routers/
        └── ai.py                     # AI API endpoints
```

---

## Next Steps

1. **Test All Agents**: Run analysis with different scenarios
2. **Process Documents**: Add policy documents for RAG
3. **Load Data**: Ingest CelesTrak data into Db2
4. **Deploy API**: Set up production API server
5. **Monitor Performance**: Track latency and accuracy

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review implementation plan: `IMPLEMENTATION_PLAN.md`
3. Test individual components using their `__main__` blocks

---

**Version**: 1.0  
**Last Updated**: 2026-06-13  
**Status**: Production Ready