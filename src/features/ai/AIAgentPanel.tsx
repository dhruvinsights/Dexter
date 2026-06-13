import { useState } from 'react';

/**
 * AI Agent chat interface for querying orbital data and getting insights.
 * Inspired by KeepTrack's AI assistant features.
 */
export function AIAgentPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: 'Hello! I can help you analyze orbital data, find satellites, and answer questions about space sustainability. What would you like to know?',
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    
    // Simulate AI response (in production, this would call your AI backend)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'This is a placeholder response. In production, this would connect to your AI agent backend to provide real insights about orbital data, collision risks, and space sustainability metrics.',
        },
      ]);
    }, 500);

    setInput('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="pointer-events-auto fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full border border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur transition-all hover:scale-105 hover:border-[#00ff88]"
      >
        <span className="text-2xl">🤖</span>
      </button>
    );
  }

  return (
    <div className="pointer-events-auto fixed bottom-24 right-6 flex h-[500px] w-96 flex-col rounded-xl border border-[#1f1f1f] bg-[#0a0a0a]/95 backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1f1f1f] p-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <div>
            <h3 className="font-mono text-sm font-medium text-white">AI Agent</h3>
            <p className="font-mono text-[10px] text-neutral-500">Orbital Intelligence Assistant</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded px-2 py-1 text-xs text-neutral-400 hover:bg-white/5 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-[#00ff88]/10 text-[#00ff88]'
                  : 'bg-[#1f1f1f] text-neutral-300'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-[#1f1f1f] p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about satellites, orbits, or risks..."
            className="flex-1 rounded-lg border border-[#1f1f1f] bg-black/50 px-3 py-2 text-sm text-white placeholder-neutral-600 outline-none focus:border-[#00ff88]/50"
          />
          <button
            onClick={handleSend}
            className="rounded-lg bg-[#00ff88]/10 px-4 py-2 text-sm font-medium text-[#00ff88] hover:bg-[#00ff88]/20"
          >
            Send
          </button>
        </div>
        <p className="mt-2 text-[10px] text-neutral-600">
          Suggested: "Show me Starlink satellites" • "What's the collision risk?" • "Explain SGP4"
        </p>
      </div>
    </div>
  );
}

// Made with Bob
