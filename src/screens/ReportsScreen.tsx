import { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import { api } from '../lib/tauri';
import { formatCents, formatMonth } from '../lib/format';
import { useToast } from '../context/toast';
import type { BudgetSummaryRow, NetWorthPoint } from '../types';

interface Props {
  month: string;
}

export default function ReportsScreen({ month }: Props) {
  const { showToast } = useToast();
  const [spendingByCategory, setSpendingByCategory] = useState<BudgetSummaryRow[]>([]);
  const [netWorthHistory, setNetWorthHistory] = useState<NetWorthPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
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

  useEffect(() => { load(); }, [load]);

  const monthlySpending = netWorthHistory.slice(-6).map((point) => ({
    month: point.month,
    label: formatMonth(point.month).replace(/\s\d{4}$/, ''),
    net_worth: point.total_cents / 100,
  }));

  const formatTooltipDollars = (value: number | string) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(Number(value));

  if (loading) return <div className="text-slate-400 text-sm p-2">Loading…</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Reports</h1>

      {/* Spending by Category */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-700 mb-4">
          Spending by Category — {formatMonth(month)}
        </h2>
        {spendingByCategory.length === 0 ? (
          <p className="text-slate-400 text-sm py-8 text-center">No spending data for this month.</p>
        ) : (
          <div className="flex items-start gap-6">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={spendingByCategory}
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
                <Legend
                  formatter={(value) => <span className="text-sm text-slate-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Net Worth Over Time */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Net Worth — Last 12 Months</h2>
        {netWorthHistory.length === 0 ? (
          <p className="text-slate-400 text-sm py-8 text-center">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={netWorthHistory} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => `$${(v / 100).toLocaleString(undefined, { notation: 'compact' })}`}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip
                formatter={(v) => [formatCents(Number(v)), 'Net Worth']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="total_cents"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: '#6366f1', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Monthly Spending (Net Worth delta chart) */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Net Worth Trend — Last 6 Months</h2>
        {monthlySpending.length === 0 ? (
          <p className="text-slate-400 text-sm py-8 text-center">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlySpending} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
              />
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
  );
}
