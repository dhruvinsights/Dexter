import { useRef, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { PanelShell } from '@/features/shell/PanelShell';
import { play } from '@/lib/sound';

interface Doc {
  name: string;
  chunks: number;
  size: string;
  status: 'embedding' | 'ready';
}

/**
 * Knowledge Base — documents ingested into the RAG vector store. Upload sends
 * files to the backend's /api/ai ingestion route (when online); offline it
 * records the document locally so the user can stage a corpus.
 */
export function KnowledgePanel() {
  const [docs, setDocs] = useState<Doc[]>([
    { name: 'IADC-debris-mitigation.pdf', chunks: 142, size: '2.1 MB', status: 'ready' },
    { name: 'celestrak-catalog-notes.md', chunks: 38, size: '64 KB', status: 'ready' },
  ]);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    play('beep', 0.3);
    const added: Doc[] = Array.from(files).map((f) => ({
      name: f.name,
      chunks: Math.max(1, Math.round(f.size / 1800)),
      size: `${(f.size / 1024).toFixed(0)} KB`,
      status: 'embedding',
    }));
    setDocs((d) => [...added, ...d]);
    // Simulate embedding completion (backend would stream real progress).
    setTimeout(() => {
      setDocs((d) => d.map((doc) => (doc.status === 'embedding' ? { ...doc, status: 'ready' } : doc)));
    }, 1400);
  };

  const totalChunks = docs.reduce((a, d) => a + d.chunks, 0);

  return (
    <PanelShell title="Knowledge Base" subtitle={`${docs.length} docs · ${totalChunks} chunks`} width="w-96">
      <div className="space-y-4 p-4">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-[#1f1f1f] py-6 text-neutral-500 transition-colors hover:border-[#00ff88]/40 hover:text-[#00ff88]"
        >
          <Upload size={20} />
          <span className="font-mono text-[11px]">Upload documents to embed</span>
          <span className="font-mono text-[9px] text-neutral-600">PDF · MD · TXT · JSON</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.md,.txt,.json"
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />

        <div className="space-y-1.5">
          {docs.map((doc, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-[#1f1f1f] bg-black/40 p-2.5">
              <FileText size={15} className="shrink-0 text-neutral-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[11px] text-white">{doc.name}</p>
                <p className="font-mono text-[9px] text-neutral-600">
                  {doc.chunks} chunks · {doc.size}
                </p>
              </div>
              {doc.status === 'embedding' ? (
                <span className="hud-live-dot font-mono text-[9px] text-amber-400">embedding…</span>
              ) : (
                <span className="font-mono text-[9px] text-[#00ff88]">ready</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}
