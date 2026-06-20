import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import { api } from '../lib/tauri';
import { formatCents, formatMonth } from '../lib/format';
import { useToast } from '../context/toast';
import type { BudgetSummaryRow, Category, CategoryMonthlyPoint, MonthComparisonRow, NetWorthPoint, SpendingRow } from '../types';

interface Props {
  month: string;
}

type ReportView = 'monthly' | 'custom-range' | 'compare' | 'category-trend';

export default function ReportsScreen({ month }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [view, setView] = useState<ReportView>('monthly');

  // Monthly view
  const [spendingByCategory, setSpendingByCategory] = useState<BudgetSummaryRow[]>([]);
  const [netWorthHistory, setNetWorthHistory] = useState<NetWorthPoint[]>([]);

  // Custom date range view
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = today.slice(0, 7) + '-01';
  const [rangeFrom, setRangeFrom] = useState(firstOfMonth);
  const [rangeTo, setRangeTo] = useState(today);
  const [rangeSpending, setRangeSpending] = useState<SpendingRow[]>([]);

  // Side-by-side comparison view
  const prevMonth = (() => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();
  const [compareA, setCompareA] = useState(prevMonth);
  const [compareB, setCompareB] = useState(month);
  const [comparison, setComparison] = useState<MonthComparisonRow[]>([]);

  // Category trend view
  const [categories, setCategories] = useState<Category[]>([]);
  // undefined = no selection; null = uncategorized; number = specific category id
  const [trendCategoryId, setTrendCategoryId] = useState<number | null | undefined>(undefined);
  const [categoryTrend, setCategoryTrend] = useState<CategoryMonthlyPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);

  const [loading, setLoading] = useState(true);

  const resolvedCategoryName = (id: number | null | undefined): string => {
    if (id === undefined) return '';
    if (id === null || id === -1) return t('common.uncategorized');
    return categories.find((c) => c.id === id)?.name ?? '';
  };

  const displayName = (name: string, id: number) =>
    id === -1 ? t('common.uncategorized') : name;

  const loadMonthly = useCallback(async () => {
    setLoading(true);
    try {
      const [summary, history] = await Promise.all([
        api.getBudgetSummary(month),
        api.getNetWorthHistory(),
      ]);
      setSpendingByCategory(summary.filter((r) => r.spent_cents > 0));
      setNetWorthHistory(history);
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [month, showToast]);

  const loadRange = useCallback(async () => {
    if (!rangeFrom || !rangeTo) return;
    setLoading(true);
    try {
      const rows = await api.getSpendingByDateRange(rangeFrom, rangeTo);
      setRangeSpending(rows);
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [rangeFrom, rangeTo, showToast]);

  const loadComparison = useCallback(async () => {
    if (!compareA || !compareB) return;
    setLoading(true);
    try {
      const rows = await api.getMonthComparison(compareA, compareB);
      setComparison(rows);
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [compareA, compareB, showToast]);

  const loadCategoryTrend = useCallback(async (catId: number | null) => {
    setTrendLoading(true);
    try {
      const points = await api.getCategoryMonthlyTrend(catId === -1 ? null : catId);
      setCategoryTrend(points);
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setTrendLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (view === 'monthly') loadMonthly();
    else if (view === 'custom-range') loadRange();
    else if (view === 'compare') loadComparison();
    else {
      setLoading(false);
    }
  }, [view, loadMonthly, loadRange, loadComparison]);

  useEffect(() => {
    api.listCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (trendCategoryId !== undefined) {
      loadCategoryTrend(trendCategoryId);
    }
  }, [trendCategoryId, loadCategoryTrend]);

  const monthlySpending = netWorthHistory.slice(-6).map((point) => ({
    month: point.month,
    label: formatMonth(point.month).replace(/\s\d{4}$/, ''),
    net_worth: point.total_cents / 100,
  }));

  const formatTooltipDollars = (value: number | string) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(Number(value));

  const tabClass = (t: ReportView) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      view === t ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
    }`;

  const prevMonthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { value: val, label: formatMonth(val) };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t('reports.title')}</h1>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button className={tabClass('monthly')} onClick={() => setView('monthly')}>{t('reports.monthly')}</button>
          <button className={tabClass('custom-range')} onClick={() => setView('custom-range')}>{t('reports.dateRange')}</button>
          <button className={tabClass('compare')} onClick={() => setView('compare')}>{t('reports.compareMonths')}</button>
          <button className={tabClass('category-trend')} onClick={() => setView('category-trend')}>{t('reports.categoryTrend')}</button>
        </div>
      </div>

      {loading && view !== 'category-trend' && <div className="text-slate-400 text-sm">{t('common.loading')}</div>}

      {/* ── Monthly view ── */}
      {!loading && view === 'monthly' && (
        <div className="space-y-8">
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-700 mb-4">
              {t('reports.spendingByCategory', { month: formatMonth(month) })}
            </h2>
            {spendingByCategory.length === 0 ? (
              <p className="text-slate-400 text-sm py-8 text-center">{t('reports.noSpending')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={spendingByCategory.map((r) => ({ ...r, category_name: displayName(r.category_name, r.category_id) }))}
                    dataKey="spent_cents"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={55}
                    paddingAngle={2}
                  >
                    {spendingByCategory.map((entry) => (
                      <Cell key={entry.category_id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCents(Number(value))}
                    labelFormatter={() => ''}
                  />
                  <Legend formatter={(value) => <span className="text-sm text-slate-600">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-700 mb-4">{t('reports.netWorthLast12')}</h2>
            {netWorthHistory.length === 0 ? (
              <p className="text-slate-400 text-sm py-8 text-center">{t('reports.noData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={netWorthHistory} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis
                    tickFormatter={(v) => `$${(v / 100).toLocaleString(undefined, { notation: 'compact' })}`}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip
                    formatter={(v) => [formatCents(Number(v)), t('reports.netWorthLabel')]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="total_cents" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-700 mb-4">{t('reports.netWorthTrend')}</h2>
            {monthlySpending.length === 0 ? (
              <p className="text-slate-400 text-sm py-8 text-center">{t('reports.noData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlySpending} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis
                    tickFormatter={(v) => `$${v.toLocaleString(undefined, { notation: 'compact' })}`}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip
                    formatter={(v) => [formatTooltipDollars(v as number), 'Net Worth']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="net_worth" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>
        </div>
      )}

      {/* ── Custom date range view ── */}
      {!loading && view === 'custom-range' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('reports.from')}</label>
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('reports.to')}</label>
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={loadRange}
                className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-indigo-700"
              >
                {t('reports.apply')}
              </button>
            </div>
          </div>

          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-700 mb-4">
              {t('reports.spendingByCategoryRange', { from: rangeFrom, to: rangeTo })}
            </h2>
            {rangeSpending.length === 0 ? (
              <p className="text-slate-400 text-sm py-8 text-center">{t('reports.noSpendingRange')}</p>
            ) : (
              <div className="flex flex-col gap-6">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={rangeSpending.map((r) => ({ ...r, category_name: displayName(r.category_name, r.category_id) }))}
                      dataKey="spent_cents"
                      nameKey="category_name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={55}
                      paddingAngle={2}
                    >
                      {rangeSpending.map((entry) => (
                        <Cell key={entry.category_id} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCents(Number(value))} labelFormatter={() => ''} />
                    <Legend formatter={(value) => <span className="text-sm text-slate-600">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">{t('reports.table.category')}</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">{t('reports.table.spent')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rangeSpending.map((row) => (
                        <tr key={row.category_id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                            {displayName(row.category_name, row.category_id)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-red-600 tabular-nums">
                            {formatCents(row.spent_cents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50">
                        <td className="px-4 py-2.5 font-semibold text-slate-700">{t('reports.table.total')}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-red-600 tabular-nums">
                          {formatCents(rangeSpending.reduce((s, r) => s + r.spent_cents, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Month comparison view ── */}
      {!loading && view === 'compare' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('reports.monthA')}</label>
                <select
                  value={compareA}
                  onChange={(e) => setCompareA(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {prevMonthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <span className="text-slate-400 text-sm pb-1.5">{t('reports.vs')}</span>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('reports.monthB')}</label>
                <select
                  value={compareB}
                  onChange={(e) => setCompareB(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {prevMonthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <button
                onClick={loadComparison}
                className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-indigo-700"
              >
                {t('reports.compare')}
              </button>
            </div>
          </div>

          <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-700">
                {formatMonth(compareA)} vs. {formatMonth(compareB)}
              </h2>
            </div>
            {comparison.length === 0 ? (
              <p className="text-slate-400 text-sm p-6 text-center">{t('reports.noSpendingMonths')}</p>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">{t('reports.table.category')}</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">{formatMonth(compareA)}</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">{formatMonth(compareB)}</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Δ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {comparison.map((row) => {
                      const diff = row.month_b_cents - row.month_a_cents;
                      return (
                        <tr key={row.category_id} className="hover:bg-slate-50">
                          <td className="px-6 py-3 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                            {displayName(row.category_name, row.category_id)}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums text-slate-700">
                            {row.month_a_cents > 0 ? formatCents(row.month_a_cents) : '—'}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums text-slate-700">
                            {row.month_b_cents > 0 ? formatCents(row.month_b_cents) : '—'}
                          </td>
                          <td className={`px-6 py-3 text-right tabular-nums font-medium text-sm ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {diff !== 0 ? `${diff > 0 ? '+' : ''}${formatCents(diff)}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td className="px-6 py-3 font-semibold text-slate-700">{t('reports.table.total')}</td>
                      <td className="px-6 py-3 text-right font-bold tabular-nums text-slate-800">
                        {formatCents(comparison.reduce((s, r) => s + r.month_a_cents, 0))}
                      </td>
                      <td className="px-6 py-3 text-right font-bold tabular-nums text-slate-800">
                        {formatCents(comparison.reduce((s, r) => s + r.month_b_cents, 0))}
                      </td>
                      <td className="px-6 py-3 text-right font-bold tabular-nums">
                        {(() => {
                          const d = comparison.reduce((s, r) => s + r.month_b_cents - r.month_a_cents, 0);
                          return <span className={d > 0 ? 'text-red-500' : 'text-emerald-600'}>{d > 0 ? '+' : ''}{formatCents(d)}</span>;
                        })()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </>
            )}
          </section>
        </div>
      )}

      {/* ── Category trend view ── */}
      {view === 'category-trend' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('reports.selectCategory')}</label>
                <select
                  value={trendCategoryId === undefined ? '' : trendCategoryId === null ? '-1' : String(trendCategoryId)}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '') setTrendCategoryId(undefined);
                    else if (v === '-1') setTrendCategoryId(null);
                    else setTrendCategoryId(Number(v));
                  }}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
                >
                  <option value="">{t('reports.selectCategory')}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                  ))}
                  <option value="-1">{t('common.uncategorized')}</option>
                </select>
              </div>
            </div>
          </div>

          {trendCategoryId === undefined ? (
            <p className="text-slate-400 text-sm py-8 text-center">{t('reports.noCategorySelected')}</p>
          ) : trendLoading ? (
            <div className="text-slate-400 text-sm">{t('common.loading')}</div>
          ) : (
            <section className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-base font-semibold text-slate-700 mb-4">
                {t('reports.categoryTrendTitle', { category: resolvedCategoryName(trendCategoryId) })}
              </h2>
              {categoryTrend.every((p) => p.income_cents === 0 && p.spent_cents === 0) ? (
                <p className="text-slate-400 text-sm py-8 text-center">{t('reports.noData')}</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis
                      tickFormatter={(v) => formatCents(v).replace(/\.00$/, '')}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      width={72}
                    />
                    <Tooltip
                      formatter={(v, name) => [
                        formatCents(Number(v)),
                        name === 'income_cents' ? t('reports.income') : t('reports.spending'),
                      ]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Legend
                      formatter={(value) => (
                        <span className="text-sm text-slate-600">
                          {value === 'income_cents' ? t('reports.income') : t('reports.spending')}
                        </span>
                      )}
                    />
                    <Bar dataKey="income_cents" name="income_cents" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="spent_cents" name="spent_cents" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
