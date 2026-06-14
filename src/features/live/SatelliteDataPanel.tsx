import { useMemo, useState } from 'react';
import { Table2 } from 'lucide-react';
import { PanelShell } from '@/features/shell/PanelShell';
import { useSimStore } from '@/state/useSimStore';

/**
 * Tabular view of the live catalogue — norad id, name, owner/flag, object
 * type, and launch year. Sourced from `useSimStore.catalogue`, built once
 * when the GP catalogue + SATCAT metadata finish loading.
 */
const ROW_CAP = 1000; // DOM rows to render at once; search narrows the rest

export function SatelliteDataPanel() {
  const catalogue = useSimStore((s) => s.catalogue);
  const selection = useSimStore((s) => s.selection);
  const [query, setQuery] = useState('');

  const { rows, total } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? catalogue.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.norad.includes(q) ||
            r.ownerName.toLowerCase().includes(q) ||
            r.type.toLowerCase().includes(q),
        )
      : catalogue;
    return { rows: filtered.slice(0, ROW_CAP), total: filtered.length };
  }, [catalogue, query]);

  const selectRow = (r: (typeof catalogue)[number]) => {
    useSimStore.getState().setMode('live');
    useSimStore.getState().select({
      index: r.index,
      norad: r.norad,
      label: r.name,
      line1: r.line1,
      line2: r.line2,
    });
  };

  return (
    <PanelShell
      title="Satellite Data"
      subtitle={`${catalogue.length.toLocaleString()} objects · ${total.toLocaleString()} matched · showing ${rows.length.toLocaleString()}`}
      icon={<Table2 size={14} />}
      width="w-[36rem]"
    >
      <div className="flex h-[520px] flex-col">
        <div className="border-b border-[#1f1f1f] p-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, NORAD ID, country, or type…"
            className="w-full rounded-lg border border-[#1f1f1f] bg-black/50 px-3 py-2 text-sm text-white placeholder-neutral-600 outline-none focus:border-[#00ff88]/50"
          />
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left font-mono text-[11px]">
            <thead className="sticky top-0 bg-[#0a0a0a] text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-semibold uppercase tracking-wider">NORAD</th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wider">Name</th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wider">Country</th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wider">Type</th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wider">Launch</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.norad}
                  onClick={() => selectRow(r)}
                  className={`cursor-pointer border-t border-[#1f1f1f] text-neutral-300 transition-colors hover:bg-white/5 ${
                    selection?.norad === r.norad ? 'bg-[#00ff88]/15 text-white' : ''
                  }`}
                >
                  <td className="px-3 py-1.5 text-neutral-500">{r.norad}</td>
                  <td className="max-w-[12rem] truncate px-3 py-1.5 text-white">{r.name}</td>
                  <td className="px-3 py-1.5">
                    {r.ownerFlag} {r.ownerName}
                  </td>
                  <td className="px-3 py-1.5">{r.type}</td>
                  <td className="px-3 py-1.5">{r.launchYear || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="py-8 text-center font-mono text-[10px] text-neutral-600">
              {catalogue.length === 0 ? 'Catalogue still loading…' : 'No matches'}
            </div>
          )}
          {total > rows.length && (
            <div className="border-t border-[#1f1f1f] py-3 text-center font-mono text-[10px] text-neutral-600">
              + {(total - rows.length).toLocaleString()} more — search to narrow the list
            </div>
          )}
        </div>
      </div>
    </PanelShell>
  );
}
