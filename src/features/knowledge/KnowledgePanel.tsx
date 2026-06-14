import { useRef, useState, useEffect } from 'react';
import { FileText, Upload, Trash2 } from 'lucide-react';
import { PanelShell } from '@/features/shell/PanelShell';
import { play } from '@/lib/sound';

interface Doc {
  name: string;
  chunks: number;
  size: string;
  status: 'embedding' | 'ready' | 'error';
  id?: string;
}

const API_BASE = 'http://localhost:8000';

/**
 * Knowledge Base — documents ingested into the RAG vector store.
 * Uploads files to backend for embedding and storage in DB2.
 */
export function KnowledgePanel() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load documents from backend on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ai/documents`);
      if (response.ok) {
        const data = await response.json();
        // Transform backend data to Doc format
        const backendDocs: Doc[] = data.documents?.map((doc: any) => ({
          name: doc.title || doc.filename || 'Unknown',
          chunks: doc.chunk_count || 0,
          size: formatSize(doc.size || 0),
          status: 'ready' as const,
          id: doc.doc_id || doc.id,
        })) || [];
        setDocs(backendDocs);
      } else {
        // Fallback to mock data if backend not available
        console.warn('Backend not available, using mock data');
        setDocs([
          { name: 'IADC-debris-mitigation.pdf', chunks: 142, size: '2.1 MB', status: 'ready' },
          { name: 'celestrak-catalog-notes.md', chunks: 38, size: '64 KB', status: 'ready' },
        ]);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      // Fallback to mock data
      setDocs([
        { name: 'IADC-debris-mitigation.pdf', chunks: 142, size: '2.1 MB', status: 'ready' },
        { name: 'celestrak-catalog-notes.md', chunks: 38, size: '64 KB', status: 'ready' },
      ]);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || loading) return;
    
    play('beep', 0.3);
    setLoading(true);

    // Add files to UI immediately with "embedding" status
    const newDocs: Doc[] = Array.from(files).map((f) => ({
      name: f.name,
      chunks: Math.max(1, Math.round(f.size / 1800)),
      size: formatSize(f.size),
      status: 'embedding' as const,
    }));
    setDocs((d) => [...newDocs, ...d]);

    // Upload each file to backend
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${API_BASE}/api/ai/upload-document`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          // Update status to ready
          setDocs((d) =>
            d.map((doc) =>
              doc.name === file.name && doc.status === 'embedding'
                ? { ...doc, status: 'ready' as const, id: result.doc_id, chunks: result.chunks || doc.chunks }
                : doc
            )
          );
          console.log(`✓ Uploaded: ${file.name}`);
        } else {
          // Mark as error
          setDocs((d) =>
            d.map((doc) =>
              doc.name === file.name && doc.status === 'embedding' ? { ...doc, status: 'error' as const } : doc
            )
          );
          console.error(`✗ Failed to upload: ${file.name}`);
        }
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        // Mark as error
        setDocs((d) =>
          d.map((doc) =>
            doc.name === file.name && doc.status === 'embedding' ? { ...doc, status: 'error' as const } : doc
          )
        );
      }
    }

    setLoading(false);
  };

  const deleteDoc = async (doc: Doc, index: number) => {
    if (!doc.id) {
      // Just remove from UI if no backend ID
      setDocs((d) => d.filter((_, i) => i !== index));
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/ai/documents/${doc.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDocs((d) => d.filter((_, i) => i !== index));
        play('beep', 0.2);
        console.log(`✓ Deleted: ${doc.name}`);
      } else {
        console.error(`✗ Failed to delete: ${doc.name}`);
      }
    } catch (error) {
      console.error(`Error deleting ${doc.name}:`, error);
    }
  };

  const totalChunks = docs.reduce((a, d) => a + d.chunks, 0);

  return (
    <PanelShell title="Knowledge Base" subtitle={`${docs.length} docs · ${totalChunks} chunks`} width="w-96">
      <div className="space-y-4 p-4">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-[#1f1f1f] py-6 text-neutral-500 transition-colors hover:border-[#00ff88]/40 hover:text-[#00ff88] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload size={20} />
          <span className="font-mono text-[11px]">
            {loading ? 'Uploading...' : 'Upload documents to embed'}
          </span>
          <span className="font-mono text-[9px] text-neutral-600">PDF · MD · TXT · JSON</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.md,.txt,.json"
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
          disabled={loading}
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
              ) : doc.status === 'error' ? (
                <span className="font-mono text-[9px] text-red-400">error</span>
              ) : (
                <span className="font-mono text-[9px] text-[#00ff88]">ready</span>
              )}
              <button
                onClick={() => deleteDoc(doc, i)}
                className="shrink-0 text-neutral-600 hover:text-red-400 transition-colors"
                title="Delete document"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        {docs.length === 0 && (
          <div className="text-center py-8 text-neutral-600 font-mono text-[10px]">
            No documents uploaded yet
          </div>
        )}
      </div>
    </PanelShell>
  );
}

// Made with Bob
