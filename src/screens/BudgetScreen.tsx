import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/tauri';
import { formatCents } from '../lib/format';
import { useToast } from '../context/toast';
import type { BudgetSummaryRow } from '../types';

interface Props {
  month: string;
}

export default function BudgetScreen({ month }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [rows, setRows] = useState<BudgetSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  // editing state: categoryId → draft string
  const [editing, setEditing] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getBudgetSummary(month);
      setRows(data);
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [month, showToast]);

  useEffect(() => { load(); }, [load]);

  const startEdit = (catId: number, current: number) => {
    setEditing((prev) => ({ ...prev, [catId]: (current / 100).toFixed(2) }));
  };

  const commitEdit = async (catId: number) => {
    const val = editing[catId];
    if (val === undefined) return;
    const parsed = parseFloat(val || '0');
    if (isNaN(parsed)) {
      showToast(t('budget.budgetInvalid'), 'error');
      setEditing((prev) => { const n = { ...prev }; delete n[catId]; return n; });
      return;
    }
    const cents = Math.round(parsed * 100);
    setEditing((prev) => { const n = { ...prev }; delete n[catId]; return n; });
    try {
      await api.setBudget(catId, month, cents);
      await load();
    } catch (e) {
      showToast(String(e), 'error');
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

  if (loading) return <div className="text-slate-400 text-sm p-2">{t('common.loading')}</div>;

  const summaryItems = [
    { label: t('budget.summary.budgeted'), value: formatCents(totalBudgeted), color: 'text-slate-800' },
    { label: t('budget.summary.spent'),    value: formatCents(totalSpent),    color: 'text-red-600' },
    {
      label: t('budget.summary.remaining'),
      value: formatCents(totalBudgeted - totalSpent),
      color: totalBudgeted - totalSpent >= 0 ? 'text-emerald-600' : 'text-red-600',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t('budget.title')}</h1>
        <div className="text-sm text-slate-500">{t('budget.hint')}</div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {summaryItems.map((item) => (
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
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('budget.table.category')}</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('budget.table.budgeted')}</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('budget.table.spent')}</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('budget.table.remaining')}</th>
              <th className="px-4 py-3 w-40 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('budget.table.progress')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const isEditing = editing[row.category_id] !== undefined;
              const progressPct = row.budgeted_cents > 0
                ? Math.min((row.spent_cents / row.budgeted_cents) * 100, 100)
                : 0;

              const isUncategorized = row.category_id === -1;
              const displayName = isUncategorized ? t('common.uncategorized') : row.category_name;
              return (
                <tr key={row.category_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="font-medium text-slate-700">{displayName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isUncategorized && isEditing ? (
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
                    ) : isUncategorized ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <button
                        onClick={() => startEdit(row.category_id, row.budgeted_cents)}
                        className="text-indigo-600 hover:text-indigo-800 hover:underline tabular-nums"
                        title={t('budget.editTooltip')}
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
