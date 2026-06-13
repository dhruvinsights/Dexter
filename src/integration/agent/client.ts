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

const DEFAULT_BASE = (import.meta.env.VITE_AI_API_URL as string | undefined) ?? 'http://localhost:8000';

function baseUrl(): string {
  // Allow runtime override from the Settings panel without a rebuild.
  try {
    return localStorage.getItem('dexter.aiApiUrl') || DEFAULT_BASE;
  } catch {
    return DEFAULT_BASE;
  }
}

export function setApiUrl(url: string): void {
  try {
    localStorage.setItem('dexter.aiApiUrl', url);
  } catch {
    /* ignore */
  }
}

export function getApiUrl(): string {
  return baseUrl();
}

async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function health(signal?: AbortSignal): Promise<AgentHealthCheck> {
  try {
    const res = await fetch(`${baseUrl()}/api/ai/health`, { signal });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as AgentHealthCheck;
  } catch {
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
}

export async function analyze(
  analysis_type: AnalysisType,
  metrics: Record<string, unknown>,
  scenario_name?: string,
  signal?: AbortSignal,
): Promise<AnalysisResponse> {
  return postJson<AnalysisResponse>('/api/ai/analyze', { analysis_type, metrics, scenario_name }, signal);
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
