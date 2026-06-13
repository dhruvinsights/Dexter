# Orbital Sentinel Backend - Setup Guide

## Overview

This backend provides AI-powered analysis for orbital sustainability using:
- **5 Specialized AI Agents**: Risk Assessment, Policy Recommendation, Sustainability Analysis, Executive Summary, and Physics Engine (Policy Validation)
- **IBM DB2 Database**: Satellite tracking and AI analysis caching
- **Ollama Integration**: Local LLM with Granite models
- **FastAPI**: RESTful API with streaming support

---

## Quick Start

### 1. Prerequisites

- Python 3.9+
- IBM DB2 Database (accessible instance)
- Ollama (running locally or remotely)
- 8GB+ RAM recommended

### 2. Environment Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials (see Configuration section below)
```

### 3. Database Setup

```bash
# Create database schema
python config/setup_db2_schema.py

# Test DB2 connection
python config/db2_connection.py
```

### 4. Verify Installation

```bash
# Test Ollama LLM
python ai/llm_client.py

# Test AI agents
python ai/agents/risk_assessor.py
python ai/agents/physics_engine.py
```

---

## Configuration

### Environment Variables (.env)

The `.env` file contains all configuration. **Never commit this file to version control.**

```env
# DB2 Database Configuration
DB2_DATABASE=TESTDB
DB2_HOST=Geetika-5y420-x86.dev.fyre.ibm.com
DB2_USERNAME=Geetika
DB2_PASSWORD=Geet#246
DB2_PORT=50000

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=granite-code:8b
OLLAMA_EMBEDDING_MODEL=granite-embedding
OLLAMA_TIMEOUT=120

# AI Agent Configuration
AI_PROVIDER=ollama
AI_TEMPERATURE=0.3
AI_MAX_TOKENS=1024
AI_TOP_P=0.9

# CelesTrak Configuration (optional)
CELESTRAK_GROUPS=active,starlink,iridium-33-debris,cosmos-2251-debris,fengyun-1c-debris
DEBRIS_SAMPLE_LIMIT=100
RATE_LIMIT_DELAY=0.5

# Application Configuration
LOG_LEVEL=INFO
ENVIRONMENT=development
```

### DB2 Connection

The DB2 connection is managed by `config/db2_connection.py` and automatically loads credentials from `.env`:

- **Host**: Your DB2 server hostname
- **Port**: Default 50000
- **Database**: Database name (TESTDB)
- **Username/Password**: Your DB2 credentials

**Features**:
- Connection pooling
- Automatic retry with exponential backoff
- Health check endpoint
- Transaction management

---

## AI Agents

### Agent 1: Risk Assessment Agent
**File**: `ai/agents/risk_assessor.py`

**Purpose**: Analyze collision risks and identify high-risk orbital shells

**Capabilities**:
- Analyze collision frequency trends
- Identify high-risk orbital shells
- Calculate Kessler syndrome probability
- Provide 10-year and 30-year projections

**Usage**:
```python
from ai.agents import RiskAssessor

assessor = RiskAssessor()
assessment = await assessor.assess_risk(metrics)
```

---

### Agent 2: Policy Recommendation Agent
**File**: `ai/agents/policy_recommender.py`

**Purpose**: Compare intervention strategies and recommend best approach

**Capabilities**:
- Compare intervention strategies
- Cost-benefit analysis
- Trade-off identification
- Actionable policy suggestions

**Usage**:
```python
from ai.agents import PolicyRecommender

recommender = PolicyRecommender()
recommendation = await recommender.recommend_policy(comparison)
```

---

### Agent 3: Sustainability Analysis Agent
**File**: `ai/agents/sustainability_analyst.py`

**Purpose**: Deep-dive into long-term orbital sustainability trajectory

**Capabilities**:
- Long-term sustainability trajectory analysis
- Critical threshold detection
- Survivability implications for operators
- 50-year prognosis

**Usage**:
```python
from ai.agents import SustainabilityAnalyst

analyst = SustainabilityAnalyst()
analysis = await analyst.analyze_sustainability(metrics, baseline_metrics)
```

---

### Agent 4: Executive Summary Agent
**File**: `ai/agents/executive_summarizer.py`

**Purpose**: Generate boardroom-ready 3-paragraph summaries

**Capabilities**:
- Situation overview
- Key findings (lead with most important metric)
- Clear recommendation for leadership

**Usage**:
```python
from ai.agents import ExecutiveSummarizer

summarizer = ExecutiveSummarizer()
summary = await summarizer.generate_summary(metrics, scenario_name)
```

---

### Agent 5: Physics Engine - Policy Validation Agent
**File**: `ai/agents/physics_engine.py`

**Purpose**: Validate orbital policies against physical constraints and sustainability metrics

**Capabilities**:
- Validate policies against physical orbital constraints
- Check compliance with IADC guidelines
- Assess feasibility of intervention strategies
- Calculate sustainability thresholds
- Identify policy conflicts and contradictions

**Policy Types Supported**:
1. **Launch Rate Limit**: Validate maximum launches per year
2. **Debris Removal**: Validate active debris removal targets
3. **Deorbit Timeline**: Validate deorbit timeline compliance (IADC 25-year rule)
4. **Collision Avoidance**: Validate maneuver thresholds
5. **Orbital Shell Capacity**: Validate capacity limits per shell
6. **Hybrid Strategy**: Validate combined intervention strategies

**Physical Constraints**:
- Kessler Threshold: 0.15 (critical debris density)
- Max Collision Frequency: 20.0 collisions/year
- Min Survivability: 70% acceptable threshold
- IADC Deorbit Rule: 25 years maximum

**Usage**:
```python
from ai.agents import PhysicsEngine, PolicyType

engine = PhysicsEngine()

# Validate launch rate policy
policy_params = {'max_launches_per_year': 500}
result = await engine.validate_policy(
    PolicyType.LAUNCH_RATE_LIMIT,
    policy_params,
    scenario_metrics
)

print(f"Status: {result['status']}")
print(f"Violations: {result['violations']}")
print(f"Recommendations: {result['recommendations']}")
```

**Validation Results**:
- `COMPLIANT`: Policy meets all physical constraints
- `NON_COMPLIANT`: Policy violates critical constraints
- `MARGINAL`: Policy has minor issues but may be acceptable
- `INSUFFICIENT_DATA`: Cannot validate due to missing data

**Example - Hybrid Strategy Validation**:
```python
hybrid_policy = {
    'launch_limit': 500,
    'removal_rate': 15,
    'deorbit_years': 20
}

result = await engine.validate_policy(
    PolicyType.HYBRID_STRATEGY,
    hybrid_policy,
    scenario_metrics
)

# Result includes validation for all components
print(result['component_results']['launch_rate'])
print(result['component_results']['debris_removal'])
print(result['component_results']['deorbit_timeline'])
```

---

## Project Structure

```
backend/
├── .env                              # Environment configuration (DO NOT COMMIT)
├── .env.example                      # Environment template
├── requirements.txt                  # Python dependencies
├── README.md                         # This file
├── README_AI_AGENTS.md               # Detailed AI agent documentation
├── IMPLEMENTATION_PLAN.md            # Implementation roadmap
│
├── config/
│   ├── config.py                     # Application configuration
│   ├── db2_connection.py             # DB2 connection manager
│   ├── db2_schema_enhanced.sql       # Database schema
│   └── setup_db2_schema.py           # Schema setup script
│
├── scripts/
│   └── fetch_celestrak_data.py       # CelesTrak data fetcher
│
├── ai/
│   ├── __init__.py
│   ├── llm_client.py                 # Ollama LLM client
│   ├── prompts.py                    # Prompt templates
│   ├── analyst.py                    # Analysis orchestrator
│   ├── data_service.py               # Data service layer
│   │
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── risk_assessor.py          # Agent 1: Risk Assessment
│   │   ├── policy_recommender.py     # Agent 2: Policy Recommendation
│   │   ├── sustainability_analyst.py # Agent 3: Sustainability Analysis
│   │   ├── executive_summarizer.py   # Agent 4: Executive Summary
│   │   └── physics_engine.py         # Agent 5: Policy Validation
│   │
│   ├── embeddings/
│   │   ├── __init__.py
│   │   ├── ollama_client.py          # Embedding generation
│   │   └── document_processor.py     # Document processing
│   │
│   └── models/
│       └── ai_models.py              # Pydantic models
│
├── api/
│   ├── __init__.py
│   └── routers/
│       ├── __init__.py
│       └── ai.py                     # AI API endpoints
│
└── tests/
    └── test_ai_agents.py             # Agent tests
```

---

## Testing

### Unit Tests

```bash
# Test individual agents
python ai/agents/risk_assessor.py
python ai/agents/policy_recommender.py
python ai/agents/sustainability_analyst.py
python ai/agents/executive_summarizer.py
python ai/agents/physics_engine.py

# Run all tests
pytest tests/
```

### Integration Tests

```bash
# Test full analysis pipeline
python ai/analyst.py
```

---

## Troubleshooting

### DB2 Connection Issues

```bash
# Test connection
python config/db2_connection.py

# Check credentials
cat .env | grep DB2

# Verify DB2 is accessible
ping Geetika-5y420-x86.dev.fyre.ibm.com
```

### Ollama Issues

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Pull required models
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

## Development Workflow

### Current Branch: `feature/physics-engine`

This branch includes:
- ✅ DB2 environment configuration (.env)
- ✅ Python dependencies (requirements.txt)
- ✅ Physics Engine - Policy Validation Agent
- ✅ Updated agent exports
- ✅ Comprehensive documentation

### Next Steps

1. **Test Physics Engine**: Run validation tests
2. **Integrate with API**: Add physics engine endpoints
3. **Load Test Data**: Ingest CelesTrak data
4. **Deploy**: Set up production environment

---

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit `.env` file to version control
- Keep DB2 credentials secure
- Use environment variables for all sensitive data
- The `.env` file is already in `.gitignore`

---

## Support

For issues or questions:
1. Check this README
2. Review `README_AI_AGENTS.md` for detailed agent documentation
3. Check `IMPLEMENTATION_PLAN.md` for architecture details
4. Test individual components using their `__main__` blocks

---

**Version**: 1.1  
**Last Updated**: 2026-06-13  
**Branch**: feature/physics-engine  
**Status**: Ready for Testing