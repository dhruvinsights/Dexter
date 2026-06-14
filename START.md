# 🚀 Quick Start Commands

## Prerequisites Check

```bash
# Check Node.js (need 18+)
node --version

# Check Python (need 3.11+)
python3 --version

# Check if Ollama is running (optional, for local AI)
curl http://localhost:11434/api/tags
```

---

## 🔧 First Time Setup (Only Once)

### 1. Install Frontend Dependencies
```bash
npm install
```

### 2. Setup Python Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 3. Configure AI Provider (Choose One)

**Option A: Use Gemini (Google) - Recommended**
```bash
# Edit backend/.env and add:
# AI_PROVIDER=gemini
# GEMINI_API_KEY=AIzaSyB09toLreZGTQscsmKbHOEzl486E-7JTsw
# GEMINI_MODEL=gemini-1.5-flash

# Already configured in your .env file!
```

**Option B: Use Ollama (Local, Free)**
```bash
# Install Ollama from https://ollama.ai
ollama pull gemma2
ollama pull granite-embedding

# Edit backend/.env:
# AI_PROVIDER=ollama
# OLLAMA_MODEL=gemma2
# OLLAMA_EMBEDDING_MODEL=granite-embedding
```

**Option C: Use OpenAI**
```bash
# Edit backend/.env:
# AI_PROVIDER=openai
# OPENAI_API_KEY=your-key-here
# OPENAI_MODEL=gpt-4
```

---

## ▶️ Start the Application

### Terminal 1: Start Backend (with AI)
```bash
cd backend
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

**Expected Output:**
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Terminal 2: Start Frontend
```bash
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## ✅ Verify Everything Works

### 1. Check Backend Health
```bash
curl http://localhost:8000/api/ai/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "llm_available": true,
  "embedding_available": true,
  "db_available": true,
  "model_name": "gemini-1.5-flash",
  "embedding_model": "granite-embedding"
}
```

### 2. Open Frontend
```bash
open http://localhost:5173
# Or manually open in browser
```

**You should see:**
- 3D Earth loading
- ~15,699 satellites appearing
- Interactive controls

### 3. Test AI Features
1. Click the 🤖 AI Agent icon
2. Select "Risk Assessment"
3. Click "Run Analysis"
4. Watch AI generate response with RAG!

---

## 🛑 Stop the Application

### Stop Backend (Terminal 1)
```bash
# Press Ctrl+C
```

### Stop Frontend (Terminal 2)
```bash
# Press Ctrl+C
```

---

## 🔄 Restart Commands (After First Setup)

You only need these two commands:

### Terminal 1: Backend
```bash
cd backend && source .venv/bin/activate && python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### Terminal 2: Frontend
```bash
npm run dev
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is in use
lsof -i :8000

# Kill process if needed
kill -9 <PID>

# Reinstall dependencies
cd backend
pip install -r requirements.txt --force-reinstall
```

### Frontend won't start
```bash
# Check if port 5173 is in use
lsof -i :5173

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### AI not responding
```bash
# Check backend logs for errors
# Check Settings panel - is AI provider configured?
# Verify API key in backend/.env

# Test Gemini API directly
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyB09toLreZGTQscsmKbHOEzl486E-7JTsw" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

### No satellites visible
```bash
# Fetch satellite data
npm run fetch-tle
npm run fetch-satcat

# Hard refresh browser
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

---

## 📊 Current Configuration

**Your system is configured with:**
- **AI Provider**: Gemini (Google)
- **API Key**: AIzaSyB09toLreZGTQscsmKbHOEzl486E-7JTsw
- **Model**: gemini-1.5-flash
- **Database**: DB2 @ Geetika-5y420-x86.dev.fyre.ibm.com
- **RAG**: Enabled (retrieves documents from DB2)

---

## 🎯 Quick Test

After starting both services, run this complete test:

```bash
# 1. Check backend health
curl http://localhost:8000/api/ai/health

# 2. Test AI analysis (should work with RAG)
curl -X POST http://localhost:8000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "analysis_type": "risk_assessment",
    "metrics": {
      "collision_probability": 0.001,
      "debris_count": 150,
      "active_satellites": 15699
    }
  }'

# 3. Open frontend
open http://localhost:5173
```

---

## 📚 More Help

- **Complete Documentation**: [`docs/README.md`](docs/README.md)
- **Project Overview**: [`docs/PROJECT_SUMMARY.md`](docs/PROJECT_SUMMARY.md)
- **AI Configuration**: [`docs/AI_CONFIGURATION_GUIDE.md`](docs/AI_CONFIGURATION_GUIDE.md)
- **User Guide**: [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md)

---

**Status**: ✅ Both services are currently running!
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs