import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '../lib/tauri';
import { formatCents } from '../lib/format';
import { useToast } from '../context/toast';
import type { AccountNetWorthRow, ExchangeRate, NetWorthPoint } from '../types';

const DISPLAY_CURRENCY_KEY = 'display_currency';

function convertCents(cents: number, fromCurrency: string, baseCurrency: string, rates: ExchangeRate[]): number {
  if (fromCurrency === baseCurrency) return cents;
  const rate = rates.find((r) => r.from_currency === fromCurrency && r.to_currency === baseCurrency);
  if (rate) return Math.round(cents * rate.rate);
  return cents;
}

export default function NetWorthScreen() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<AccountNetWorthRow[]>([]);
  const [history, setHistory] = useState<NetWorthPoint[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const baseCurrency = localStorage.getItem(DISPLAY_CURRENCY_KEY) ?? 'USD';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accs, hist, rates] = await Promise.all([
        api.getNetWorthDetail(),
        api.getNetWorthHistory(),
        api.listExchangeRates(),
      ]);
      setAccounts(accs);
      setHistory(hist);
      setExchangeRates(rates);
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const hasMultiCurrency = accounts.some((a) => a.currency !== baseCurrency);

  const totalCurrent = accounts.reduce(
    (s, a) => s + convertCents(a.current_balance, a.currency, baseCurrency, exchangeRates), 0,
  );
  const totalPrev = accounts.reduce(
    (s, a) => s + convertCents(a.prev_month_balance, a.currency, baseCurrency, exchangeRates), 0,
  );
  const delta = totalCurrent - totalPrev;

  if (loading) return <div className="text-slate-400 text-sm p-2">{t('common.loading')}</div>;

  return (
    <div className="space-y-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-800">{t('netWorth.title')}</h1>

      {/* Summary header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-8">
        <div>
          <p className="text-sm text-slate-500 mb-1">
            {t('netWorth.totalNetWorth')}
            {hasMultiCurrency && (
              <span className="ml-2 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">
                {t('netWorth.inCurrency', { currency: baseCurrency })}
              </span>
            )}
          </p>
          <p className={`text-3xl font-bold tabular-nums ${totalCurrent >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
            {formatCents(totalCurrent, baseCurrency)}
          </p>
        </div>
        <div className="border-l border-slate-200 pl-8">
          <p className="text-sm text-slate-500 mb-1">{t('netWorth.vsLastMonth')}</p>
          <p className={`text-xl font-semibold tabular-nums ${delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {delta >= 0 ? '+' : ''}{formatCents(delta, baseCurrency)}
          </p>
        </div>
      </div>

      {/* Account breakdown */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-700">{t('netWorth.accountBreakdown')}</h2>
        </div>
        {accounts.length === 0 ? (
          <p className="text-slate-400 text-sm p-6">{t('netWorth.noAccounts')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('netWorth.table.account')}</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('netWorth.table.type')}</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('netWorth.table.currentBalance')}</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('netWorth.table.vsLastMonth')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((acc) => {
                const accDelta = acc.current_balance - acc.prev_month_balance;
                return (
                  <tr key={acc.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-800">{acc.name}</td>
                    <td className="px-6 py-3">
                      <span className="capitalize text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {acc.type}
                      </span>
                    </td>
                    <td className={`px-6 py-3 text-right font-semibold tabular-nums ${acc.current_balance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                      {formatCents(acc.current_balance, acc.currency)}
                    </td>
                    <td className={`px-6 py-3 text-right tabular-nums text-sm font-medium ${accDelta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {accDelta >= 0 ? '+' : ''}{formatCents(accDelta, acc.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-slate-700">{t('netWorth.table.total')}</td>
                <td className={`px-6 py-3 text-right font-bold tabular-nums ${totalCurrent >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                  {formatCents(totalCurrent)}
                </td>
                <td className={`px-6 py-3 text-right font-semibold tabular-nums text-sm ${delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {delta >= 0 ? '+' : ''}{formatCents(delta)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </section>

      {/* Net worth history */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-700 mb-4">{t('netWorth.netWorthLast12')}</h2>
        {history.length === 0 ? (
          <p className="text-slate-400 text-sm py-8 text-center">{t('netWorth.noData')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={history} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
                formatter={(v) => [formatCents(Number(v)), t('netWorth.title')]}
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
    </div>
  );
}
