import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { PanelShell } from '@/features/shell/PanelShell';
import { useSimStore } from '@/state/useSimStore';
import { play } from '@/lib/sound';
import {
  analyze,
  health,
  streamAnalysis,
  type AgentHealthCheck,
  type AnalysisType,
} from '@/integration/agent/client';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK: { label: string; type: AnalysisType }[] = [
  { label: 'Risk assessment', type: 'risk_assessment' },
  { label: 'Sustainability', type: 'sustainability_analysis' },
  { label: 'Executive summary', type: 'executive_summary' },
];

/**
 * AI Agent panel — talks to the FastAPI backend (backend/api/routers/ai.py)
 * with SSE streaming when available, and degrades gracefully when offline.
 */
export function AIAgentPanel() {
  const scenarioId = useSimStore((s) => s.scenarioId);
  const output = useSimStore((s) => s.output);
  const [hc, setHc] = useState<AgentHealthCheck | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'Orbital intelligence online. Ask about collision risk, debris growth, or run a structured analysis with the buttons below.',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    health(ctrl.signal).then(setHc).catch(() => {});
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // Derive the indicator fields the backend prompt expects (see
  // backend/ai/prompts.py → validate_metrics) from the real physics output.
  const currentMetrics = (): Record<string, unknown> => {
    const years = output.simulation_years || 1;
    const objs = output.total_objects_per_year;
    const cols = output.total_collisions_per_year;
    const sum = (rows: number[][], t: number) => rows[t]?.reduce((a, b) => a + b, 0) ?? 0;

    const initialObj = objs[0] ?? 0;
    const finalObj = objs.at(-1) ?? initialObj;
    const debris0 = sum(output.debris_per_shell, 0);
    const debrisN = sum(output.debris_per_shell, output.debris_per_shell.length - 1);
    const totalCollisions = cols.reduce((a, b) => a + b, 0);

    const collisionFrequency = Number((totalCollisions / years).toFixed(2)); // avg collisions/yr
    const debrisGrowthPct = debris0 > 0 ? Number((((debrisN - debris0) / debris0) * 100).toFixed(1)) : 0;
    // Survivability: inverse-risk proxy from collision pressure (0–100).
    const survivabilityPct = Number(Math.max(0, 100 - collisionFrequency * 4).toFixed(1));
    // Congestion: object count relative to a heavily-congested reference (~70k).
    const congestionIndex = Number(Math.min(1, finalObj / 70000).toFixed(2));

    return {
      scenario_id: scenarioId,
      collision_frequency: collisionFrequency,
      debris_growth_pct: debrisGrowthPct,
      survivability_pct: survivabilityPct,
      congestion_index: congestionIndex,
      simulation_years: years,
      final_total: finalObj,
    };
  };

  const runAnalysis = async (type: AnalysisType) => {
    if (busy) return;
    play('beep', 0.3);
    setBusy(true);
    setMessages((m) => [...m, { role: 'user', content: `Run ${type.replace(/_/g, ' ')}` }, { role: 'assistant', content: '' }]);
    try {
      let streamed = false;
      try {
        for await (const tok of streamAnalysis(scenarioId, type)) {
          streamed = true;
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: 'assistant', content: copy[copy.length - 1].content + tok };
            return copy;
          });
        }
      } catch {
        streamed = false;
      }
      if (!streamed) {
        const res = await analyze(type, currentMetrics(), scenarioId);
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'assistant', content: res.content };
          return copy;
        });
      }
    } catch (error) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: 'assistant',
          content:
            '⚠️ AI backend offline or not configured.\n\n' +
            '**To use AI features:**\n' +
            '1. Click the Settings icon (⚙️) in the sidebar\n' +
            '2. Choose your AI provider (Ollama, OpenAI, or Gemini)\n' +
            '3. Enter your API key or configure Ollama endpoint\n' +
            '4. Click "Save Configuration"\n\n' +
            'The backend will automatically connect once configured.',
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    const q = input.trim();
    if (!q || busy) return;
    play('click', 0.25);
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: q }, { role: 'assistant', content: '' }]);
    setBusy(true);
    try {
      const res = await analyze('risk_assessment', { ...currentMetrics(), question: q }, scenarioId);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', content: res.content };
        return copy;
      });
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: 'assistant',
          content: '⚠ AI backend offline — see Settings to configure the endpoint.',
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  };

  const dot =
    hc?.status === 'healthy'
      ? 'bg-[#00ff88]'
      : hc?.status === 'degraded'
        ? 'bg-amber-400'
        : 'bg-neutral-600';

  return (
    <PanelShell
      title="AI Agent"
      subtitle={hc?.model_name && hc.model_name !== 'unknown' ? hc.model_name : 'Orbital Intelligence'}
      icon={<Sparkles size={14} />}
      width="w-96"
      status={
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-neutral-400">
          <span className={`h-1.5 w-1.5 rounded-full ${dot} ${hc?.status === 'healthy' ? 'hud-live-dot' : ''}`} />
          {hc?.status ?? '…'}
        </span>
      }
    >
      <div className="flex h-[460px] flex-col">
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#00ff88]/10 text-[#00ff88]'
                    : 'bg-[#141414] text-neutral-300'
                }`}
              >
                {msg.content || (busy ? '▍' : '')}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[#1f1f1f] p-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button
                key={q.type}
                disabled={busy}
                onClick={() => runAnalysis(q.type)}
                className="rounded border border-[#1f1f1f] px-2 py-1 font-mono text-[10px] text-neutral-400 transition-colors hover:border-[#00ff88]/40 hover:text-[#00ff88] disabled:opacity-40"
              >
                {q.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about risk, debris, congestion…"
              className="flex-1 rounded-lg border border-[#1f1f1f] bg-black/50 px-3 py-2 text-sm text-white placeholder-neutral-600 outline-none focus:border-[#00ff88]/50"
            />
            <button
              onClick={handleSend}
              disabled={busy}
              className="flex items-center justify-center rounded-lg bg-[#00ff88]/10 px-3 text-[#00ff88] transition-colors hover:bg-[#00ff88]/20 disabled:opacity-40"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}
