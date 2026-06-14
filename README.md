# 🛰️ Dexter — Orbital Sustainability Platform

**Status**: ✅ **RUNNING**  
Real-time 3D space situational awareness with AI-powered orbital sustainability analysis.

---

## 🚀 Quick Start

### Currently Running
```
Frontend: http://localhost:5173
Backend:  http://localhost:8000
API Docs: http://localhost:8000/docs
```

### Start from Scratch
```bash
# Terminal 1: Backend
cd backend
source .venv/bin/activate
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000

# Terminal 2: Frontend  
npm run dev
```

---

## 📊 What's Working

### What is real vs. modelled

Dexter is explicit about its data provenance:

| Feature | Source | Real? |
|---------|--------|-------|
| **Live Sky** satellites/positions | CelesTrak GP catalogue + SGP4 (`satellite.js`) | ✅ Real data, real physics |
| **Object types / countries** | CelesTrak SATCAT | ✅ Real |
| **Shell Analysis** (current debris by altitude) | SATCAT apogee/perigee binned into shells | ✅ Real current state |
| **Scenario / Forecasting** projections | MOCAT-style source–sink model **seeded from the real catalogue** | ⚙️ Physics model (deterministic projection, not telemetry) |
| **AI Agent** | Local Ollama / OpenAI / Gemini (optional) | Depends on your config |

The Scenario/Forecast numbers come from a real **source–sink debris model** (`src/sim/mocat.ts`): launches and post-mission derelicts and collision fragments as sources; atmospheric drag decay, PMD compliance and ADR as sinks; collisions via the particle-in-a-box rate λ = ⟨σv⟩·NᵢNⱼ/V. It is seeded from the real on-orbit population (`public/shells.json`, built by `npm run build-shells` from SATCAT). This is a model — the same *kind* of model as MIT MOCAT / ESA MASTER — not measured data, and the UI says so.

### ✅ Core Features
- **Live Satellite Tracking** - real catalogue with real SGP4 physics
- **3D Visualization** - React Three Fiber with day/night Earth
- **Shell Analysis** - real per-altitude debris distribution + Kessler stability indicator
- **Physics Engine** - MOCAT-style debris source–sink projection seeded from real data
- **Time Controls** - Speed up, slow down, or scrub through time
- **Time Machine** - Watch satellite deployment history from 1957
- **Interactive Selection** - Click any satellite to inspect
- **Custom Satellites** - Create your own with TLE import
- **AI Backend** - 5 specialized agents for analysis
- **Database** - Connected to DB2 for persistence and RAG
- **AI Analysis** - Multi-provider support (Ollama, OpenAI, Gemini, Custom)
  - Risk assessment with RAG-enhanced responses
  - Policy recommendations citing specific guidelines
  - Sustainability analysis
  - Collision prediction
  - Executive summaries

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (React + Three.js)            │
│  - 3D Earth visualization               │
│  - SGP4 propagation (Web Worker)        │
│  - ~16k satellites rendered             │
└──────────────┬──────────────────────────┘
               │ HTTP/SSE
┌──────────────▼──────────────────────────┐
│  Backend (FastAPI + Python)             │
│  - 5 AI Agents                          │
│  - Physics engine                       │
│  - Policy validation                    │
└──────┬────────────────┬─────────────────┘
       │                │
┌──────▼──────┐  ┌──────▼──────┐
│   DB2       │  │   Ollama    │
│ (Geetika's) │  │  (Optional) │
└─────────────┘  └─────────────┘
```

---

## 📦 Installation

### Prerequisites
- Node.js ≥ 18
- Python ≥ 3.10
- Internet (for initial data fetch)

### First Time Setup

```bash
# 1. Frontend
npm install
npm run fetch-tle      # Download live catalogue (CelesTrak GP/TLE; ≤ every 2h)
npm run fetch-satcat   # Download object metadata (owner, type)
npm run build-shells   # Build the real per-altitude seed for the physics engine

# 2. Backend
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements-minimal.txt
pip install ibm-db ollama

# 3. Configure AI Provider (Choose one)
# Option A: Ollama (Free, Local)
ollama pull gemma2
ollama pull granite-embedding

# Option B: Gemini (Google)
# Add to backend/.env:
# AI_PROVIDER=gemini
# GEMINI_API_KEY=your-key-here

# Option C: OpenAI
# Add to backend/.env:
# AI_PROVIDER=openai
# OPENAI_API_KEY=your-key-here
```

---

## 🎮 Usage

### Basic Demo Flow
1. Open http://localhost:5173
2. Wait ~10 seconds for boot sequence
3. See 3D Earth with ~16,000 satellites
4. Click any satellite to select and zoom
5. Use time controls to speed up/slow down
6. Try Time Machine to see launch history

### Advanced Features
- **Create Satellite**: Click + icon, enter orbital parameters
- **Color Schemes**: Switch between country, object type, sunlight
- **AI Analysis**: Click AI icon (requires Ollama)
- **Time Travel**: Use date picker to jump to any time

---

## 🔧 Configuration

### AI Configuration

**Dynamic Configuration via UI** (Recommended):
1. Open Settings panel (⚙️ icon)
2. Select AI provider: Ollama, OpenAI, Gemini, or Custom
3. Enter API key (if required)
4. Choose model
5. Click "Save Settings"

**Or via backend/.env**:
```ini
# Database (Already configured)
DB2_HOST=Geetika-5y420-x86.dev.fyre.ibm.com
DB2_DATABASE=TESTDB
DB2_USERNAME=Geetika

# AI Provider (can be changed via UI)
AI_PROVIDER=gemini
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-1.5-flash
```

See [docs/AI_CONFIGURATION_GUIDE.md](docs/AI_CONFIGURATION_GUIDE.md) for complete details.

---

## 📁 Project Structure

```
Dexter/
├── src/                    # Frontend
│   ├── viz/               # 3D visualization (Three.js)
│   ├── features/          # UI components
│   ├── sim/               # SGP4 worker
│   └── integration/       # Backend client
├── backend/               # Python backend
│   ├── api/              # FastAPI routes
│   ├── ai/               # 5 AI agents
│   │   ├── agents/       # Risk, Policy, Sustainability, etc.
│   │   └── embeddings/   # RAG pipeline
│   └── config/           # DB2 connection
├── public/               # Static assets
│   ├── tle/             # Satellite data (2.6 MB)
│   ├── satcat.json      # Metadata (1.5 MB)
│   └── meshes/          # 3D models
└── plans/               # Architecture docs
```

---

## 🔌 API Reference

### Backend Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/docs` | Interactive API docs |
| POST | `/api/ai/analyze` | Run AI analysis |
| GET | `/api/ai/health` | System health |
| GET | `/api/ai/stream/{id}` | Stream analysis (SSE) |

### Example
```bash
# Health check
curl http://localhost:8000/

# AI health
curl http://localhost:8000/api/ai/health

# Run analysis
curl -X POST http://localhost:8000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"analysis_type":"risk_assessment","metrics":{}}'
```

---

## 🐛 Troubleshooting

### No satellites visible
1. Check TLE data exists: `ls -lh public/tle/TLE.txt`
2. Hard refresh: Cmd/Ctrl + Shift + R
3. Check browser console for errors

### Backend won't start
```bash
# Check port
lsof -i :8000

# View logs
tail -f backend/backend.log

# Reinstall
cd backend && pip install -r requirements-minimal.txt --force-reinstall
```

### AI features offline
1. Install Ollama: https://ollama.ai/
2. Pull models: `ollama pull llama2`
3. Verify: `curl http://localhost:11434/api/tags`

---

## 📊 Performance

- **Boot Time**: ~10 seconds
- **Frame Rate**: 60 FPS (16k objects)
- **Memory**: ~500 MB (Chrome)
- **Backend**: <100ms response time

### Optimization
- Reduce MAX_OBJECTS in `src/viz/LiveField.tsx`
- Use production build: `npm run build`
- Enable GPU acceleration

---

## 🚢 Deployment

### Production Build
```bash
# Frontend
npm run build
# Output: dist/

# Backend
cd backend
gunicorn api.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

---

## 📚 Documentation

All documentation has been organized in the [`docs/`](docs/) folder:

- **[docs/README.md](docs/README.md)** - Complete documentation index
- **[docs/QUICK_START_AI.md](docs/QUICK_START_AI.md)** - Get started with AI in 5 minutes
- **[docs/USER_GUIDE.md](docs/USER_GUIDE.md)** - Complete user guide
- **[docs/AI_CONFIGURATION_GUIDE.md](docs/AI_CONFIGURATION_GUIDE.md)** - Configure AI providers
- **[docs/DATABASE_AND_KNOWLEDGE_BASE_EXPLAINED.md](docs/DATABASE_AND_KNOWLEDGE_BASE_EXPLAINED.md)** - Database & RAG system
- **[docs/RAG_IMPLEMENTATION_COMPLETE.md](docs/RAG_IMPLEMENTATION_COMPLETE.md)** - RAG implementation details
- **[backend/README.md](backend/README.md)** - Backend AI agents documentation
- **[plans/](plans/)** - System architecture and roadmap

---

## 🎯 Features

### Live Sky Mode
- Real NORAD catalogue (~16k objects)
- SGP4 propagation in Web Worker
- Country-colored dots (SATCAT data)
- Click to select → camera flies to object
- Real 3D models (ISS, Starlink, Hubble, etc.)
- True SGP4 orbit paths

### Time Controls
- Date/Time picker with calendar
- Propagation rate: 1x to 100x
- Jump to any instant in time
- Time Machine: 1957 to present

### Create Satellites
- Basic mode: name, inclination, apogee, perigee
- Advanced mode: full element set
- TLE import: paste raw two-line elements
- Generates valid checksummed TLE

### AI Analysis (Multi-Provider)
- **RAG-Enhanced**: Retrieves relevant documents from DB2 before generating responses
- **Risk Assessment**: Collision analysis citing IADC guidelines
- **Policy Recommendations**: Standards-based suggestions
- **Sustainability Analysis**: Orbital environment impact
- **Executive Summaries**: High-level insights
- **Streaming Responses**: Real-time SSE updates
- **Providers**: Ollama (local), OpenAI, Gemini, Custom endpoints

---

## 🤝 Team

- **Kunal**: Physics engine, policy engine, data integration
- **Dhruv**: Orbital simulator, 3D visualization, integration
- **Rishab**: Visualization, UI components
- **Geetika**: CelesTrak data, AI agents, DB2 setup
- **Pawan**: AI integration

---

## 📄 License

See LICENSE file for details.

---

## 🔗 Resources

- **CelesTrak**: https://celestrak.org/
- **SGP4 Library**: https://github.com/shashwatak/satellite-js
- **Three.js**: https://threejs.org/
- **FastAPI**: https://fastapi.tiangolo.com/
- **Ollama**: https://ollama.ai/

---

**Status**: 🟢 **LIVE**  
**Frontend**: http://localhost:5173  
**Backend**: http://localhost:8000  
**Last Updated**: June 14, 2026