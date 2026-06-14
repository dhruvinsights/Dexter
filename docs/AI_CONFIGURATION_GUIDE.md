# AI Configuration System - Complete Guide

## Overview

The Dexter/Orbital Sentinel project now supports **dynamic AI provider configuration** through the frontend Settings panel. Users can switch between Ollama, OpenAI, Gemini, or custom OpenAI-compatible endpoints **without restarting the backend**.

## What Changed

### Before (Old System)
- ❌ AI provider hardcoded in backend `.env` file
- ❌ Required backend restart to change providers
- ❌ No way to configure from frontend
- ❌ Only supported Ollama and Gemini (hardcoded)

### After (New System)
- ✅ AI provider configurable from frontend Settings
- ✅ No backend restart needed - changes apply instantly
- ✅ Supports Ollama, OpenAI, Gemini, and custom endpoints
- ✅ Settings saved to localStorage and sent to backend
- ✅ Backend validates configuration and provides feedback

## Architecture

```
Frontend Settings Panel
        ↓
   localStorage (persistence)
        ↓
POST /api/ai/configure
        ↓
Runtime Config Manager
        ↓
Universal LLM Client (reinitializes)
        ↓
Provider-Specific Client (Ollama/OpenAI/Gemini)
```

## New Files Created

### Backend

1. **`backend/ai/runtime_config.py`**
   - `AIProviderConfig` - Pydantic model for configuration
   - `RuntimeConfigManager` - Manages runtime configuration
   - Loads from environment variables on startup
   - Accepts updates via API

2. **`backend/ai/openai_client.py`**
   - `OpenAICompatibleClient` - Works with OpenAI, Gemini, and custom endpoints
   - Uses official `openai` Python package
   - Supports both generation and streaming

3. **`backend/ai/llm_client.py`** (Updated)
   - Now supports runtime reconfiguration
   - `reconfigure()` method to switch providers
   - Lazy initialization - only creates client when needed
   - Supports all four providers

### Frontend

1. **`src/integration/agent/client.ts`** (Updated)
   - `configureAI()` - Send configuration to backend
   - `getAIConfiguration()` - Retrieve current configuration

2. **`src/features/settings/SettingsPanel.tsx`** (Updated)
   - Now sends configuration to backend on save
   - Maps frontend settings to backend API format

3. **`src/features/ai/AIAgentPanel.tsx`** (Updated)
   - Better error message guiding users to Settings
   - Explains how to configure AI providers

### API Endpoints

1. **`POST /api/ai/configure`**
   - Accepts AI provider configuration
   - Validates settings based on provider type
   - Reinitializes LLM client
   - Returns success/failure with health check

2. **`GET /api/ai/configuration`**
   - Returns current configuration (without sensitive data)
   - Shows current provider and model

## How to Use

### For End Users

1. **Open the application** at http://localhost:5173

2. **Click Settings** (⚙️ icon in sidebar)

3. **Choose your AI provider:**

   **Option A: Ollama (Local)**
   - Select "OLLAMA" button
   - Enter Ollama endpoint (default: `http://localhost:11434`)
   - Enter model name (e.g., `llama3.1`, `mistral`)
   - Click "Save Configuration"

   **Option B: OpenAI**
   - Select "OPENAI" button
   - Enter your OpenAI API key
   - Enter model name (e.g., `gpt-4o-mini`, `gpt-4`)
   - Click "Save Configuration"

   **Option C: Gemini**
   - Select "OPENAI" button (Gemini uses OpenAI-compatible API)
   - Enter your Gemini API key (starts with `AIzaSy...`)
   - Enter model name (e.g., `gemini-1.5-flash-latest`)
   - Click "Save Configuration"

   **Option D: Custom Endpoint**
   - Select "CUSTOM" button
   - Configure via backend `.env` file:
     ```ini
     AI_PROVIDER=custom
     OPENAI_API_KEY=your_key_here
     OPENAI_BASE_URL=https://your-endpoint.com/v1
     OPENAI_MODEL=your-model-name
     ```

4. **Test AI features:**
   - Go to "AI Agent" tab
   - Click "Risk assessment" or other analysis buttons
   - AI should respond using your configured provider

### For Developers

#### Testing Configuration API

```bash
# Configure Gemini
curl -X POST http://localhost:8000/api/ai/configure \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gemini",
    "gemini_api_key": "AIzaSy...",
    "gemini_model": "gemini-1.5-flash-latest",
    "temperature": 0.3,
    "max_tokens": 1024,
    "top_p": 0.9
  }'

# Configure OpenAI
curl -X POST http://localhost:8000/api/ai/configure \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "openai_api_key": "sk-...",
    "openai_model": "gpt-4o-mini",
    "temperature": 0.3,
    "max_tokens": 1024,
    "top_p": 0.9
  }'

# Configure Ollama
curl -X POST http://localhost:8000/api/ai/configure \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "ollama",
    "ollama_url": "http://localhost:11434",
    "ollama_model": "llama3.1",
    "temperature": 0.3,
    "max_tokens": 1024,
    "top_p": 0.9
  }'

# Get current configuration
curl http://localhost:8000/api/ai/configuration
```

#### Response Format

```json
{
  "success": true,
  "message": "AI provider configured successfully: gemini",
  "provider": "gemini",
  "model": "gemini-1.5-flash-latest",
  "health_check": true,
  "configuration": {
    "provider": "gemini",
    "gemini_model": "gemini-1.5-flash-latest",
    "temperature": 0.3,
    "max_tokens": 1024,
    "top_p": 0.9,
    "gemini_api_key_set": true
  }
}
```

## Configuration Validation

The backend validates configuration based on provider:

### Ollama
- ✅ Requires: `ollama_url`, `ollama_model`
- ❌ Rejects if missing

### OpenAI
- ✅ Requires: `openai_api_key`, `openai_model`
- ❌ Rejects if missing

### Gemini
- ✅ Requires: `gemini_api_key`, `gemini_model`
- ❌ Rejects if missing

### Custom
- ✅ Requires: `openai_api_key`, `openai_base_url`
- ❌ Rejects if missing

## Environment Variables (Fallback)

If no configuration is provided via API, the backend loads from `.env`:

```ini
# Provider selection
AI_PROVIDER=gemini  # ollama, openai, gemini, custom

# Ollama settings
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1

# OpenAI settings
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=  # Optional, for custom endpoints

# Gemini settings
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-1.5-flash-latest

# Generation parameters
AI_TEMPERATURE=0.3
AI_MAX_TOKENS=1024
AI_TOP_P=0.9
```

## Troubleshooting

### "AI backend offline" Error

**Cause:** Backend not running or not configured

**Solution:**
1. Check backend is running: `curl http://localhost:8000/api/ai/health`
2. Go to Settings and configure AI provider
3. Click "Save Configuration"
4. Try AI feature again

### "Invalid API key" Error

**Cause:** API key format incorrect or expired

**Solution:**
1. Verify API key is correct
2. For Gemini: Key should start with `AIzaSy`
3. For OpenAI: Key should start with `sk-`
4. Check key hasn't expired
5. Reconfigure in Settings

### "Model not available" Error

**Cause:** Model name incorrect or not accessible

**Solution:**
1. Check model name spelling
2. For Ollama: Run `ollama list` to see available models
3. For OpenAI: Use `gpt-4o-mini`, `gpt-4`, `gpt-3.5-turbo`
4. For Gemini: Use `gemini-1.5-flash-latest`, `gemini-1.5-pro-latest`

### Configuration Not Persisting

**Cause:** localStorage not working or backend not receiving config

**Solution:**
1. Check browser console for errors
2. Verify backend logs show "Received configuration request"
3. Try clearing browser cache and reconfiguring
4. Check network tab for failed API calls

## Security Notes

1. **API Keys in Frontend:**
   - Keys are stored in localStorage (browser-only)
   - Keys are sent to backend via HTTPS (in production)
   - Keys are NOT exposed in API responses

2. **API Keys in Backend:**
   - Keys are stored in memory only
   - Keys are NOT logged
   - Keys are NOT returned in `/configuration` endpoint

3. **Best Practices:**
   - Use environment variables for production
   - Don't commit API keys to git
   - Rotate keys regularly
   - Use least-privilege API keys

## Future Enhancements

- [ ] Encrypt API keys in localStorage
- [ ] Support for Azure OpenAI
- [ ] Support for Anthropic Claude
- [ ] Support for Cohere
- [ ] Model auto-detection
- [ ] Configuration presets
- [ ] Multi-model fallback
- [ ] Cost tracking per provider

## Migration Guide

### From Old System to New System

**If you were using Gemini (hardcoded):**
1. Your existing `.env` configuration still works
2. Optionally, configure via Settings UI for easier management

**If you were using Ollama:**
1. Your existing setup still works
2. You can now switch providers without restart

**If you want to add OpenAI:**
1. Get API key from https://platform.openai.com/api-keys
2. Go to Settings → Select OPENAI → Enter key → Save

## Support

For issues or questions:
1. Check backend logs: `tail -f backend/backend.log`
2. Check browser console for frontend errors
3. Verify API endpoint: `curl http://localhost:8000/api/ai/health`
4. Review this guide's troubleshooting section

## Summary

The new AI configuration system provides:
- ✅ **Flexibility:** Switch providers without restart
- ✅ **User-Friendly:** Configure via UI, not config files
- ✅ **Extensible:** Easy to add new providers
- ✅ **Robust:** Validates configuration before applying
- ✅ **Transparent:** Clear error messages and feedback

Users can now easily try different AI providers and find the best fit for their needs!