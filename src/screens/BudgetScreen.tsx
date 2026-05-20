import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/tauri';
import { formatCents } from '../lib/format';
import type { BudgetSummaryRow } from '../types';

interface Props {
  month: string;
}

export default function BudgetScreen({ month }: Props) {
  const [rows, setRows] = useState<BudgetSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // editing state: categoryId → draft string
  const [editing, setEditing] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getBudgetSummary(month);
      setRows(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const startEdit = (catId: number, current: number) => {
    setEditing((prev) => ({ ...prev, [catId]: (current / 100).toFixed(2) }));
  };

  const commitEdit = async (catId: number) => {
    const val = editing[catId];
    if (val === undefined) return;
    const cents = Math.round(parseFloat(val || '0') * 100);
    setEditing((prev) => { const n = { ...prev }; delete n[catId]; return n; });
    try {
      await api.setBudget(catId, month, cents);
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const statusColor = (budgeted: number, spent: number): string => {
    if (budgeted === 0) return 'bg-slate-200';
    const pct = spent / budgeted;
    if (pct >= 1) return 'bg-red-500';
    if (pct >= 0.8) return 'bg-amber-400';
    return 'bg-emerald-500';
  };

  const remainingColor = (budgeted: number, spent: number): string => {
    if (budgeted === 0) return 'text-slate-400';
    const remaining = budgeted - spent;
    if (remaining < 0) return 'text-red-600 font-semibold';
    if (spent / budgeted >= 0.8) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const totalBudgeted = rows.reduce((s, r) => s + r.budgeted_cents, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent_cents, 0);

  if (loading) return <div className="text-slate-400 text-sm p-2">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Budget</h1>
        <div className="text-sm text-slate-500">Click a budget amount to edit it</div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Budgeted', value: formatCents(totalBudgeted), color: 'text-slate-800' },
          { label: 'Total Spent', value: formatCents(totalSpent), color: 'text-red-600' },
          {
            label: 'Remaining',
            value: formatCents(totalBudgeted - totalSpent),
            color: totalBudgeted - totalSpent >= 0 ? 'text-emerald-600' : 'text-red-600',
          },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">{item.label}</p>
            <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Budgeted</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Spent</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Remaining</th>
              <th className="px-4 py-3 w-40 text-xs font-semibold text-slate-500 uppercase tracking-wider">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const isEditing = editing[row.category_id] !== undefined;
              const progressPct = row.budgeted_cents > 0
                ? Math.min((row.spent_cents / row.budgeted_cents) * 100, 100)
                : 0;

              return (
                <tr key={row.category_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="font-medium text-slate-700">{row.category_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <input
                        autoFocus
                        type="number"
                        step="0.01"
                        value={editing[row.category_id]}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [row.category_id]: e.target.value }))}
                        onBlur={() => commitEdit(row.category_id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit(row.category_id);
                          if (e.key === 'Escape') setEditing((prev) => { const n = { ...prev }; delete n[row.category_id]; return n; });
                        }}
                        className="w-28 text-right border border-indigo-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <button
                        onClick={() => startEdit(row.category_id, row.budgeted_cents)}
                        className="text-indigo-600 hover:text-indigo-800 hover:underline tabular-nums"
                        title="Click to edit budget"
                      >
                        {formatCents(row.budgeted_cents)}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                    {formatCents(row.spent_cents)}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums ${remainingColor(row.budgeted_cents, row.spent_cents)}`}>
                    {row.budgeted_cents > 0
                      ? formatCents(row.budgeted_cents - row.spent_cents)
                      : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {row.budgeted_cents > 0 && (
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${statusColor(row.budgeted_cents, row.spent_cents)}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
