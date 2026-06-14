/**
 * Typed client for the Dexter AI backend (FastAPI service vendored under /backend).
 *
 * Mirrors the contract in backend/api/routers/ai.py:
 *   POST /api/ai/analyze              → AnalysisResponse
 *   GET  /api/ai/stream/{scenario}    → SSE token stream
 *   GET  /api/ai/quick-summary/{id}   → AnalysisResponse
 *   POST /api/ai/compare              → AnalysisResponse
 *   GET  /api/ai/health               → AgentHealthCheck
 *   GET  /api/ai/models               → model availability
 *
 * The backend is optional: when it is offline every call resolves to a graceful
 * `offline` result so the UI keeps working against mocks (matching the rest of
 * the app's mock-first architecture).
 */

export type AnalysisType =
  | 'risk_assessment'
  | 'recommendation'
  | 'sustainability_analysis'
  | 'executive_summary';

export interface AnalysisResponse {
  content: string;
  analysis_type: AnalysisType;
  model_name?: string;
  scenario_name?: string;
  generated_at?: string;
}

export interface AgentHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  llm_available: boolean;
  embedding_available: boolean;
  db_available: boolean;
  model_name: string;
  embedding_model: string;
  timestamp: string;
}

// Backend resolution with automatic failover. Render is the hosted default,
// Railway is the hosted fallback, and localhost remains available for local
// backend development. A manual Settings override always wins.
export const RENDER_BACKEND_URL = 'https://dexter-space.onrender.com';
export const RAILWAY_BACKEND_URL = 'https://dexter-production-ff80.up.railway.app';
export const LOCAL_BACKEND_URL = 'http://localhost:8000';

const PRIMARY_BASE =
  (import.meta.env.VITE_AI_API_URL as string | undefined)?.replace(/\/+$/, '') || RENDER_BACKEND_URL;
const FALLBACK_BASE =
  (import.meta.env.VITE_AI_API_FALLBACK_URL as string | undefined)?.replace(/\/+$/, '') || RAILWAY_BACKEND_URL;

let activeBase = PRIMARY_BASE;

function normalizeBase(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Ordered, de-duped candidates: manual override → primary → fallback → localhost. */
function candidates(): string[] {
  const list: string[] = [];
  try {
    const override = localStorage.getItem('dexter.aiApiUrl');
    if (override) list.push(normalizeBase(override));
  } catch {
    /* ignore */
  }
  list.push(PRIMARY_BASE, FALLBACK_BASE, LOCAL_BACKEND_URL);
  return [...new Set(list.filter(Boolean).map(normalizeBase))];
}

export function getBackendOptions(): Array<{ label: string; url: string }> {
  return [
    { label: 'Render (default)', url: RENDER_BACKEND_URL },
    { label: 'Railway', url: RAILWAY_BACKEND_URL },
    { label: 'Local development', url: LOCAL_BACKEND_URL },
  ];
}

export function setApiUrl(url: string): void {
  const clean = normalizeBase(url);
  try {
    localStorage.setItem('dexter.aiApiUrl', clean);
  } catch {
    /* ignore */
  }
  activeBase = clean;
}

export function getApiUrl(): string {
  try {
    const override = localStorage.getItem('dexter.aiApiUrl');
    if (override) {
      activeBase = normalizeBase(override);
    }
  } catch {
    /* ignore */
  }
  return activeBase;
}

function baseUrl(): string {
  return getApiUrl();
}

/** HTTP error from a *reachable* backend — distinct from a network failure. */
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Run a request against the active backend; on a network failure (backend
 * unreachable) transparently retry the next candidate and pin it as active.
 * A real HTTP error (429/500/…) is surfaced as-is — both backends share the
 * same provider, so failing over wouldn't help.
 */
async function withFailover<T>(run: (base: string) => Promise<T>): Promise<T> {
  const ordered = [activeBase, ...candidates().filter((b) => b !== activeBase)];
  let lastErr: unknown;
  for (const base of ordered) {
    try {
      const out = await run(base);
      activeBase = base;
      return out;
    } catch (e) {
      lastErr = e;
      if (e instanceof HttpError) {
        activeBase = base; // reachable — stop probing other bases
        throw e;
      }
      // network error → try the next candidate
    }
  }
  throw lastErr;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  return withFailover(async (base) => {
    const res = await fetch(`${base}${path}`, init);
    if (!res.ok) throw new HttpError(res.status, `${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
  });
}

async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return fetchJson<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
}

export async function health(signal?: AbortSignal): Promise<AgentHealthCheck> {
  // Probe candidates in order; first reachable one becomes the active backend.
  for (const base of candidates()) {
    try {
      const res = await fetch(`${base}/api/ai/health`, { signal });
      if (!res.ok) continue;
      activeBase = base;
      return (await res.json()) as AgentHealthCheck;
    } catch {
      /* unreachable — try next candidate */
    }
  }
  return {
    status: 'offline',
    llm_available: false,
    embedding_available: false,
    db_available: false,
    model_name: 'unknown',
    embedding_model: 'unknown',
    timestamp: new Date().toISOString(),
  };
}

export async function analyze(
  analysis_type: AnalysisType,
  metrics: Record<string, unknown>,
  scenario_name?: string,
  signal?: AbortSignal,
): Promise<AnalysisResponse> {
  return postJson<AnalysisResponse>('/api/ai/analyze', { analysis_type, metrics, scenario_name }, signal);
}

export interface ChatResponse {
  content: string;
  scenario_id?: string;
  model_used?: string;
  generated_at?: string;
  latency_seconds?: number;
}

/** Free-text conversational reply (answers the message, not a canned report). */
export async function chat(
  question: string,
  metrics: Record<string, unknown>,
  scenario_name?: string,
  signal?: AbortSignal,
): Promise<ChatResponse> {
  return postJson<ChatResponse>('/api/ai/chat', { question, metrics, scenario_name }, signal);
}

export async function quickSummary(scenarioId: string, signal?: AbortSignal): Promise<AnalysisResponse> {
  const res = await fetch(`${baseUrl()}/api/ai/quick-summary/${encodeURIComponent(scenarioId)}`, { signal });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as AnalysisResponse;
}

/**
 * Stream analysis tokens via SSE. Yields tokens until the stream ends.
 * Falls back by throwing so callers can switch to a non-streaming path.
 */
export async function* streamAnalysis(
  scenarioId: string,
  analysisType: AnalysisType = 'risk_assessment',
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const url = `${baseUrl()}/api/ai/stream/${encodeURIComponent(scenarioId)}?analysis_type=${analysisType}`;
  const res = await fetch(url, { signal, headers: { Accept: 'text/event-stream' } });
  if (!res.ok || !res.body) throw new Error(`${res.status} ${res.statusText}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const obj = JSON.parse(payload) as { token?: string; error?: string };
        if (obj.error) throw new Error(obj.error);
        if (obj.token) yield obj.token;
      } catch {
        /* skip malformed frame */
      }
    }
  }
}

/**
 * Configure AI provider settings dynamically
 */
export async function configureAI(config: {
  provider: string;
  ollama_url?: string;
  ollama_model?: string;
  openai_api_key?: string;
  openai_model?: string;
  openai_base_url?: string;
  gemini_api_key?: string;
  gemini_model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}, signal?: AbortSignal): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${baseUrl()}/api/ai/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
      signal,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || `${res.status} ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.error('Failed to configure AI:', error);
    throw error;
  }
}

/**
 * Get current AI configuration
 */
export async function getAIConfiguration(signal?: AbortSignal): Promise<{
  success: boolean;
  configuration: Record<string, unknown>;
  current_model: string;
  current_provider: string;
}> {
  try {
    const res = await fetch(`${baseUrl()}/api/ai/configuration`, { signal });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (error) {
    console.error('Failed to get AI configuration:', error);
    throw error;
  }
}
