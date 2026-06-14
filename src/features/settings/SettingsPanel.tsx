import { useEffect, useState } from 'react';
import { PanelShell } from '@/features/shell/PanelShell';
import { getApiUrl, setApiUrl, health, configureAI, type AgentHealthCheck } from '@/integration/agent/client';
import { play } from '@/lib/sound';

/**
 * Settings — AI backend endpoint, model provider (local Ollama / remote API),
 * and the vector database connection used by the RAG pipeline.
 *
 * Per the project owner, "DB2" here means a generic vector database, so the
 * form captures a driver-agnostic connection (host / port / db / SSL / creds).
 * Values are persisted to localStorage and read by the backend config form;
 * the backend's actual driver is selected server-side.
 */
type Provider = 'ollama' | 'openai' | 'gemini' | 'custom';

interface Conf {
  apiUrl: string;
  provider: Provider;
  ollamaUrl: string;
  ollamaModel: string;
  openaiKey: string;
  openaiModel: string;
  geminiKey: string;
  geminiModel: string;
  vdb: {
    driver: string;
    host: string;
    port: string;
    database: string;
    ssl: boolean;
    username: string;
    password: string;
  };
}

const KEY = 'dexter.settings';

const DEFAULTS: Conf = {
  apiUrl: getApiUrl(),
  provider: 'ollama',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.1',
  openaiKey: '',
  openaiModel: 'gpt-4o-mini',
  geminiKey: '',
  geminiModel: 'gemini-1.5-flash',
  vdb: { driver: 'qdrant', host: 'localhost', port: '6333', database: 'orbital', ssl: false, username: '', password: '' },
};

function load(): Conf {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULTS;
}

export function SettingsPanel() {
  const [conf, setConf] = useState<Conf>(load);
  const [hc, setHc] = useState<AgentHealthCheck | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    health().then(setHc).catch(() => {});
  }, []);

  const save = async () => {
    play('button', 0.4);
    setApiUrl(conf.apiUrl);
    
    // Save to localStorage
    try {
      localStorage.setItem(KEY, JSON.stringify(conf));
    } catch {
      /* ignore */
    }
    
    // Send configuration to backend
    try {
      const aiConfig = {
        provider: conf.provider,
        ollama_url: conf.ollamaUrl,
        ollama_model: conf.ollamaModel,
        openai_api_key: conf.openaiKey,
        openai_model: conf.openaiModel,
        openai_base_url: conf.provider === 'custom' ? conf.apiUrl : undefined,
        gemini_api_key: conf.geminiKey,
        gemini_model: conf.geminiModel,
        temperature: 0.3,
        max_tokens: 1024,
        top_p: 0.9,
      };
      
      await configureAI(aiConfig);
    } catch (error) {
      console.error('Failed to configure backend:', error);
    }
    
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    health().then(setHc).catch(() => {});
  };

  const set = <K extends keyof Conf>(k: K, v: Conf[K]) => setConf((c) => ({ ...c, [k]: v }));
  const setVdb = (k: keyof Conf['vdb'], v: string | boolean) =>
    setConf((c) => ({ ...c, vdb: { ...c.vdb, [k]: v } }));

  return (
    <PanelShell title="Settings" subtitle="AI · models · vector database" width="w-96">
      <div className="space-y-6 p-4">
        <Section title="AI Backend">
          <Field label="API endpoint">
            <input className={inputCls} value={conf.apiUrl} onChange={(e) => set('apiUrl', e.target.value)} />
          </Field>
          <div className="flex items-center justify-between rounded border border-[#1f1f1f] bg-black/40 px-3 py-2">
            <span className="font-mono text-[10px] text-neutral-400">backend status</span>
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-white">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  hc?.status === 'healthy' ? 'bg-[#00ff88]' : hc?.status === 'degraded' ? 'bg-amber-400' : 'bg-neutral-600'
                }`}
              />
              {hc?.status ?? 'unknown'}
            </span>
          </div>
        </Section>

        <Section title="Model Provider">
          <div className="grid grid-cols-2 gap-1.5">
            {(['ollama', 'openai', 'gemini', 'custom'] as Provider[]).map((p) => (
              <button
                key={p}
                onClick={() => set('provider', p)}
                className={`rounded border px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  conf.provider === p
                    ? 'border-[#00ff88]/40 bg-[#00ff88]/10 text-[#00ff88]'
                    : 'border-[#1f1f1f] text-neutral-500 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {conf.provider === 'ollama' && (
            <>
              <Field label="Ollama endpoint (serve or Electron app)">
                <input className={inputCls} value={conf.ollamaUrl} onChange={(e) => set('ollamaUrl', e.target.value)} />
              </Field>
              <Field label="Model">
                <input className={inputCls} value={conf.ollamaModel} onChange={(e) => set('ollamaModel', e.target.value)} />
              </Field>
              <p className="font-mono text-[9px] text-neutral-600">
                Detects a local Ollama at this URL (default :11434). The packaged Electron app exposes the same HTTP API.
              </p>
            </>
          )}
          {conf.provider === 'openai' && (
            <>
              <Field label="API key">
                <input type="password" className={inputCls} value={conf.openaiKey} onChange={(e) => set('openaiKey', e.target.value)} />
              </Field>
              <Field label="Model">
                <input className={inputCls} value={conf.openaiModel} onChange={(e) => set('openaiModel', e.target.value)} />
              </Field>
            </>
          )}
          {conf.provider === 'gemini' && (
            <>
              <Field label="API key">
                <input type="password" className={inputCls} value={conf.geminiKey} onChange={(e) => set('geminiKey', e.target.value)} placeholder="AIzaSy..." />
              </Field>
              <Field label="Model">
                <input className={inputCls} value={conf.geminiModel} onChange={(e) => set('geminiModel', e.target.value)} />
              </Field>
              <p className="font-mono text-[9px] text-neutral-600">
                Get your API key from Google AI Studio (ai.google.dev)
              </p>
            </>
          )}
          {conf.provider === 'custom' && (
            <p className="font-mono text-[10px] text-neutral-500">
              Configure a custom OpenAI-compatible endpoint via the backend .env (OPENAI_BASE_URL).
            </p>
          )}
        </Section>

        <Section title="Vector Database (RAG)">
          <Field label="Driver">
            <select className={inputCls} value={conf.vdb.driver} onChange={(e) => setVdb('driver', e.target.value)}>
              {['qdrant', 'pgvector', 'milvus', 'weaviate', 'chroma', 'ibm-db2'].map((d) => (
                <option key={d} value={d} className="bg-black">
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Host">
              <input className={inputCls} value={conf.vdb.host} onChange={(e) => setVdb('host', e.target.value)} />
            </Field>
            <Field label="Port">
              <input className={inputCls} value={conf.vdb.port} onChange={(e) => setVdb('port', e.target.value)} />
            </Field>
          </div>
          <Field label="Database / collection">
            <input className={inputCls} value={conf.vdb.database} onChange={(e) => setVdb('database', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Username">
              <input className={inputCls} value={conf.vdb.username} onChange={(e) => setVdb('username', e.target.value)} />
            </Field>
            <Field label="Password">
              <input type="password" className={inputCls} value={conf.vdb.password} onChange={(e) => setVdb('password', e.target.value)} />
            </Field>
          </div>
          <label className="flex cursor-pointer items-center gap-2 font-mono text-[10px] text-neutral-400">
            <input type="checkbox" checked={conf.vdb.ssl} onChange={(e) => setVdb('ssl', e.target.checked)} />
            Use SSL / TLS
          </label>
        </Section>

        <button
          onClick={save}
          className="w-full rounded-lg bg-[#00ff88]/10 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-[#00ff88] transition-colors hover:bg-[#00ff88]/20"
        >
          {saved ? '✓ Saved' : 'Save configuration'}
        </button>
      </div>
    </PanelShell>
  );
}

const inputCls =
  'w-full rounded border border-[#1f1f1f] bg-black/50 px-2.5 py-1.5 font-mono text-[11px] text-white outline-none focus:border-[#00ff88]/50';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-600">{label}</span>
      {children}
    </label>
  );
}
