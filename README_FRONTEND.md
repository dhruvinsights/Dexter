# Dexter Frontend README

Dexter is a frontend-first space debris tracking and orbital sustainability application. The UI renders the live orbital catalog, runs local forecasting and shell analysis, and can optionally connect to an AI/RAG backend for policy analysis, summaries, and conversational assistance.

## Frontend overview

The frontend is built with:
- React + TypeScript
- Vite
- React Three Fiber / Three.js
- Zustand for UI and simulation state
- Tailwind-style utility classes for panel styling

The application is usable without the backend. Core visualization, simulation, shell analysis, and scenario tooling run in the browser. The backend adds optional AI features.

## Architecture

### Core layers

- `src/viz/`
  - 3D Earth scene, satellite rendering, orbit paths, lighting, camera controls, and color schemes
- `src/sim/`
  - orbital propagation helpers, debris evolution logic, shell definitions, metrics, and worker-based live sky updates
- `src/features/`
  - panel-based UI for live tracking, AI, forecasting, knowledge, settings, timeline, shell customization, and scenario workflows
- `src/state/`
  - Zustand stores for shell state, UI panel state, region filters, and custom satellites
- `src/integration/`
  - backend contracts, mocks, and AI agent client integration

### Frontend behavior

Dexter uses a panel-driven shell:
- Live orbital view remains central
- Feature panels slide in as focused workspaces
- Optional AI backend is accessed through the integration client
- If the backend is unavailable, the frontend remains functional and reports offline status gracefully

## Key frontend panels and features

### Live Panel
- Real-time orbital object visualization
- Satellite selection and inspection
- Region and filtering workflows
- Color scheme switching

### Satellite Info / Data Panels
- Object metadata
- Orbit-related details
- Context for selected satellites and debris objects

### Forecasting and Shell Analysis
- Shell-level orbital sustainability analysis
- Debris concentration and scenario modeling
- Forecasting workflows for long-term orbital outcomes

### Scenario Workspace
- Compare intervention strategies
- Explore sustainability and policy tradeoffs
- Review projected impacts over time

### AI Agent Panel
- Optional AI-assisted analysis
- Risk assessments
- Recommendations
- Sustainability analysis
- Executive summaries
- Conversational backend integration when available

### Knowledge Panel
- Knowledge and reference workflows tied to the optional backend/RAG layer

### Settings Panel
- Runtime backend URL switching
- AI provider configuration
- Vector database / RAG-related settings
- Backend health visibility

## Backend integration

The frontend supports multiple backend deployments for the optional AI/RAG service.

### Supported hosted backends

- Render: `https://dexter-space.onrender.com`
- Railway: `https://dexter-production-ff80.up.railway.app`

### Default backend

The frontend agent client now defaults to Render:

- Default: `https://dexter-space.onrender.com`
- Fallback: `https://dexter-production-ff80.up.railway.app`

Local development is also supported:

- Local: `http://localhost:8000`

### Runtime backend switching

Users can switch backend URLs at runtime from the **Settings** panel.

In the Settings panel:
1. Open **Settings**
2. Go to **AI Backend**
3. Choose one of the preset backend options:
   - Render (default)
   - Railway
   - Local development
4. Or manually edit the API endpoint field
5. Click **Save configuration**

The selected backend URL is persisted in local storage and becomes the active backend for AI requests.

### Failover behavior

The agent client supports ordered backend resolution:
1. Manual Settings override
2. Primary backend
3. Fallback backend
4. Local backend candidate

If the active backend is unreachable due to a network failure, the client can fail over to the next available backend candidate. This helps keep the AI panel usable when one hosted deployment is temporarily unavailable.

## Local frontend setup

### Prerequisites
- Node.js 18+
- npm

### Install dependencies

```bash
npm install
```

### Run the frontend

```bash
npm run dev
```

Default local frontend URL:
- `http://localhost:5173`

## Optional local backend setup

If you want to run the AI backend locally:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

Then in the frontend Settings panel, select:
- `Local development`
or enter:
- `http://localhost:8000`

## Recommended backend usage

For most users:
- Start with Render: `https://dexter-space.onrender.com`

If Render is unavailable or slower:
- Switch to Railway: `https://dexter-production-ff80.up.railway.app`

For local development:
- Use `http://localhost:8000`

## Environment configuration

### Using .env for configuration

The frontend supports optional environment-based configuration via a `.env` file:

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Configure AI backend URLs (optional):**
   ```bash
   # Set primary backend (defaults to Render if not set)
   VITE_AI_API_URL=https://dexter-space.onrender.com
   
   # Set fallback backend (defaults to Railway if not set)
   VITE_AI_API_FALLBACK_URL=https://dexter-production-ff80.up.railway.app
   
   # Or use local backend for development
   VITE_AI_API_URL=http://localhost:8000
   ```

3. **Configure Space-Track credentials (optional):**
   Only needed if you want to fetch the full satellite catalogue:
   ```bash
   SPACETRACK_USER=your@email.com
   SPACETRACK_PASS=your-password
   ```

### Environment variables

The frontend client supports these environment variables:
- `VITE_AI_API_URL` - Primary AI backend URL (defaults to Render)
- `VITE_AI_API_FALLBACK_URL` - Fallback AI backend URL (defaults to Railway)
- `SPACETRACK_USER` - Space-Track.org username (for data fetching only)
- `SPACETRACK_PASS` - Space-Track.org password (for data fetching only)

**Important notes:**
- Environment variables set the **initial defaults** only
- Users can switch backends at runtime via the Settings panel
- The `.env` file is gitignored for security
- The frontend works without any `.env` file (uses built-in defaults)

## What the Settings panel now supports

The Settings panel includes backend URL configuration at runtime:
- preset backend selection buttons
- editable API endpoint field
- backend health indicator
- save/persist behavior

This satisfies the runtime backend switching requirement for hosted AI deployments.

## Suggested user workflow

1. Start the frontend
2. Explore live orbital visualization and shell analysis without backend dependency
3. Open Settings
4. Select Render or Railway backend
5. Save configuration
6. Open AI Agent panel
7. Use AI analysis and policy workflows

## Relevant files

- `src/integration/agent/client.ts`
- `src/features/settings/SettingsPanel.tsx`
- `src/features/ai/AIAgentPanel.tsx`
- `src/features/live/LivePanel.tsx`
- `src/features/forecast/ForecastingPanel.tsx`
- `src/features/scenario/ScenarioWorkspace.tsx`

## Summary

Dexter frontend is a browser-based orbital sustainability workspace with optional AI augmentation.

Backend options:
- Render: `https://dexter-space.onrender.com`
- Railway: `https://dexter-production-ff80.up.railway.app`

Users can switch between these backends at runtime through the Settings panel without redeploying the frontend.