# Orbital Sentinel Documentation

Complete documentation for the Orbital Sentinel project - a real-time satellite tracking and orbital analysis system with AI-powered insights.

## 📚 Documentation Index

### Quick Start
- **[QUICK_START_AI.md](QUICK_START_AI.md)** - Get started with AI features in 5 minutes
- **[USER_GUIDE.md](USER_GUIDE.md)** - Complete user guide for all features

### Technical Documentation
- **[AI_CONFIGURATION_GUIDE.md](AI_CONFIGURATION_GUIDE.md)** - Configure AI providers (Ollama, OpenAI, Gemini, Custom)
- **[DATABASE_AND_KNOWLEDGE_BASE_EXPLAINED.md](DATABASE_AND_KNOWLEDGE_BASE_EXPLAINED.md)** - Database architecture and RAG system
- **[RAG_IMPLEMENTATION_COMPLETE.md](RAG_IMPLEMENTATION_COMPLETE.md)** - RAG (Retrieval-Augmented Generation) implementation details

### Implementation Reports
- **[GEMINI_FIX_SUMMARY.md](GEMINI_FIX_SUMMARY.md)** - Gemini API integration fix details
- **[RAG_VERIFICATION_REPORT.md](RAG_VERIFICATION_REPORT.md)** - RAG system verification and testing

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- IBM DB2 database (optional, for RAG features)

### Installation

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd Dexter
npm install
```

2. **Setup backend**:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

3. **Configure environment**:
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your settings
```

4. **Start services**:
```bash
# Terminal 1 - Backend
cd backend
source .venv/bin/activate
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 - Frontend
npm run dev
```

5. **Access the application**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 🎯 Key Features

### 1. Real-Time Satellite Tracking
- **15,699 satellites** tracked in real-time using TLE data
- **3D visualization** with Three.js and React Three Fiber
- **SGP4 propagation** for accurate orbital mechanics
- **Time machine** to view past/future positions

### 2. AI-Powered Analysis
- **Multi-provider support**: Ollama (local), OpenAI, Gemini, Custom endpoints
- **RAG system**: Retrieves relevant documents from DB2 before generating responses
- **5 analysis types**:
  - Risk Assessment
  - Sustainability Analysis
  - Policy Recommendations
  - Collision Prediction
  - Executive Summary

### 3. Knowledge Base
- **Document storage** in IBM DB2
- **Vector embeddings** for semantic search
- **Policy documents**: IADC guidelines, orbital standards, etc.
- **RAG integration**: AI cites specific documents in responses

### 4. Interactive Visualization
- **Color schemes**: Country, Object Type, Sunlight
- **Region filtering**: LEO, MEO, GEO, HEO
- **Satellite selection**: Click to view details and orbit
- **Custom satellites**: Add your own TLE data

---

## 🏗️ Architecture

### Frontend (React + TypeScript)
```
src/
├── features/          # UI components (panels, controls)
├── viz/              # 3D visualization (Three.js)
├── sim/              # Orbital simulation (SGP4)
├── state/            # Zustand state management
└── integration/      # Backend API client
```

### Backend (Python + FastAPI)
```
backend/
├── api/              # REST API endpoints
├── ai/               # AI agents and LLM clients
│   ├── agents/       # Specialized AI agents
│   ├── embeddings/   # Document processing
│   └── runtime_config.py  # Dynamic AI configuration
└── config/           # Database and settings
```

### Database (IBM DB2)
- `policy_documents` - RAG document storage
- `document_embeddings` - Vector embeddings
- `satellite_catalog` - 15,699 space objects
- `orbital_elements` - TLE data

---

## 🤖 AI Configuration

### Supported Providers

1. **Ollama (Local)**
   - Free, runs on your machine
   - Models: gemma2, llama3, mistral, etc.
   - Best for: Privacy, offline use

2. **OpenAI**
   - Requires API key
   - Models: gpt-4, gpt-3.5-turbo
   - Best for: Production, quality

3. **Gemini (Google)**
   - Requires API key
   - Models: gemini-1.5-flash, gemini-1.5-pro
   - Best for: Fast responses, cost-effective

4. **Custom**
   - Any OpenAI-compatible endpoint
   - Self-hosted models
   - Best for: Custom deployments

### Configuration via UI

1. Open Settings panel (⚙️ icon)
2. Select AI provider
3. Enter API key (if required)
4. Choose model
5. Click "Save Settings"

Configuration is applied immediately without restart!

---

## 📊 RAG System

### How It Works

1. **Document Storage**: Policy documents stored in DB2 with embeddings
2. **Query Processing**: User asks AI a question
3. **Document Retrieval**: System searches DB2 for relevant documents
4. **Context Enhancement**: Retrieved documents added to AI prompt
5. **Response Generation**: AI generates response citing specific documents

### Example Flow

```
User: "What are the collision avoidance guidelines?"
  ↓
System retrieves: IADC-debris-mitigation.pdf (sections 4.2, 5.1)
  ↓
AI response: "According to IADC guidelines section 4.2, satellites must..."
```

### Verification

Check backend logs for RAG activity:
```
INFO:ai.analyst:Retrieving documents from DB2 for: collision avoidance
INFO:ai.analyst:✓ Retrieved 2 relevant documents from DB2
INFO:ai.analyst:✓ Enhanced prompt with 2 documents (1847 chars)
```

---

## 🔧 Troubleshooting

### Backend won't start
```bash
# Check Python version
python --version  # Should be 3.11+

# Reinstall dependencies
pip install -r requirements.txt

# Check .env file
cat backend/.env
```

### Frontend won't start
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### AI not responding
1. Check Settings panel - is provider configured?
2. Check backend logs for errors
3. Verify API key is valid
4. Test with Ollama (no API key needed)

### Database connection failed
1. Check DB2 credentials in `backend/.env`
2. Verify network access to DB2 host
3. RAG features require DB2, but app works without it

---

## 📝 Development

### Adding New Features

1. **Frontend**: Add components in `src/features/`
2. **Backend**: Add endpoints in `backend/api/routers/`
3. **AI Agents**: Add agents in `backend/ai/agents/`
4. **Documentation**: Update relevant docs in `docs/`

### Code Structure

- **State Management**: Zustand stores in `src/state/`
- **API Client**: `src/integration/agent/client.ts`
- **3D Rendering**: React Three Fiber in `src/viz/`
- **Orbital Math**: `src/lib/orbital.ts` and `src/sim/`

### Testing

```bash
# Backend tests
cd backend
pytest tests/

# Frontend (manual testing)
npm run dev
```

---

## 🤝 Team

Based on the chat history, this project was built by:
- **Kunal** - Physics engine, policy engine
- **Dhruv** - Orbital simulator, visualization
- **Rishab** - Backend, orbital simulator
- **Geetika** - Data fetching, AI agents
- **Pawan** - AI integration

---

## 📄 License

[Add license information]

---

## 🔗 Additional Resources

- [Plans Directory](../plans/) - System architecture and roadmap
- [Backend README](../backend/README.md) - Backend-specific documentation
- [Main README](../README.md) - Project overview

---

**Last Updated**: June 14, 2026
**Version**: 1.0.0