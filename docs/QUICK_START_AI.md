# Quick Start: Configure Gemini AI

## Your Gemini API Key
```
AIzaSyAb8RN6IrIAUTx0QW-ZPgoY19yW2EKlaRzjohe_awTKSqVCPrRg
```

## Step-by-Step Instructions

### 1. Open the Application
- Go to: http://localhost:5173
- You should see the 3D Earth with satellites

### 2. Open Settings
- Look at the **left sidebar**
- Click the **⚙️ Settings** icon (gear icon)
- Settings panel will slide in from the right

### 3. Configure Gemini
You'll see 4 buttons in a 2x2 grid:
- OLLAMA | OPENAI
- GEMINI | CUSTOM

**Click the "GEMINI" button** (bottom-left)

### 4. Enter Your Credentials
Two fields will appear:

**API KEY field:**
```
AIzaSyAb8RN6IrIAUTx0QW-ZPgoY19yW2EKlaRzjohe_awTKSqVCPrRg
```
(Copy-paste this exactly)

**MODEL field:**
```
gemini-1.5-flash-latest
```
(This should already be filled in)

### 5. Save Configuration
- Click the green **"SAVE CONFIGURATION"** button at the bottom
- You should see "✓ Saved" briefly
- The backend status should show "healthy" (green dot)

### 6. Test AI Features
- Close Settings panel (click X or click outside)
- Click **"AI Agent"** tab in the left sidebar
- You'll see 3 buttons:
  - Risk assessment
  - Sustainability  
  - Executive summary
- **Click "Risk assessment"**
- AI should start responding with analysis

## What You Should See

### In Settings Panel:
```
┌─────────────────────────────────┐
│ SETTINGS                    ✕   │
│ AI · models · vector database   │
├─────────────────────────────────┤
│ AI BACKEND                      │
│ API endpoint                    │
│ http://localhost:8000           │
│ backend status        ● healthy │
│                                 │
│ MODEL PROVIDER                  │
│ ┌────────┬────────┐            │
│ │ OLLAMA │ OPENAI │            │
│ ├────────┼────────┤            │
│ │ GEMINI │ CUSTOM │  ← Click!  │
│ └────────┴────────┘            │
│                                 │
│ API KEY                         │
│ ●●●●●●●●●●●●●●●●●●●●●●●●●●●●   │
│                                 │
│ MODEL                           │
│ gemini-1.5-flash-latest         │
│                                 │
│ Get your API key from Google    │
│ AI Studio (ai.google.dev)       │
│                                 │
│ [  SAVE CONFIGURATION  ]        │
└─────────────────────────────────┘
```

### In AI Agent Panel:
```
┌─────────────────────────────────┐
│ AI AGENT                    ✕   │
│ gemini-1.5-flash-latest         │
├─────────────────────────────────┤
│ Orbital intelligence online.    │
│ Ask about collision risk...     │
│                                 │
│ [Risk assessment]               │
│ [Sustainability]                │
│ [Executive summary]             │
│                                 │
│ Ask about risk, debris...       │
│ [                          ] 📤 │
└─────────────────────────────────┘
```

## Troubleshooting

### If you see "AI backend offline"
1. Check backend is running in Terminal 1
2. You should see: `INFO: Application startup complete.`
3. If not, restart: `cd backend && source .venv/bin/activate && python -m uvicorn api.main:app --reload`

### If you see "Invalid API key"
1. Double-check you copied the FULL key (starts with `AIzaSy`)
2. Make sure there are no extra spaces
3. Try copy-pasting again

### If Settings panel doesn't open
1. Refresh the page (F5)
2. Check browser console for errors (F12)
3. Make sure frontend is running in Terminal 2

## Testing Commands (Optional)

You can also test via command line:

```bash
# Test configuration endpoint
curl -X POST http://localhost:8000/api/ai/configure \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gemini",
    "gemini_api_key": "AIzaSyAb8RN6IrIAUTx0QW-ZPgoY19yW2EKlaRzjohe_awTKSqVCPrRg",
    "gemini_model": "gemini-1.5-flash-latest",
    "temperature": 0.3,
    "max_tokens": 1024,
    "top_p": 0.9
  }'

# Test analysis endpoint
curl -X POST http://localhost:8000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "analysis_type": "risk_assessment",
    "metrics": {
      "scenario_id": "test",
      "collision_frequency": 12.5,
      "debris_growth_pct": 15.3,
      "survivability_pct": 87.2,
      "congestion_index": 95,
      "score": 78,
      "grade": "B"
    }
  }'
```

## Expected Result

After configuration, when you click "Risk assessment", you should see AI-generated text like:

```
Based on the current orbital metrics, the collision risk is moderate to high. 
With a collision frequency of 12.5 events per year and debris growth at 15.3%, 
the orbital environment shows concerning trends...
```

The text will appear word-by-word (streaming effect).

## Summary

1. ✅ Open http://localhost:5173
2. ✅ Click Settings (⚙️)
3. ✅ Click GEMINI button
4. ✅ Paste API key: `AIzaSyAb8RN6IrIAUTx0QW-ZPgoY19yW2EKlaRzjohe_awTKSqVCPrRg`
5. ✅ Model: `gemini-1.5-flash-latest`
6. ✅ Click SAVE CONFIGURATION
7. ✅ Go to AI Agent tab
8. ✅ Click "Risk assessment"
9. ✅ Watch AI respond!

That's it! The AI is now configured and ready to use.