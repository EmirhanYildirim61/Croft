import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/tauri';
import { formatCents } from '../lib/format';
import { useToast } from '../context/toast';
import type { AccountWithBalance, RecurringItem } from '../types';

interface Props {
  accounts: AccountWithBalance[];
  onRefresh?: () => void;
}

function annualCents(item: RecurringItem): number {
  const abs = Math.abs(item.amount_cents);
  switch (item.frequency) {
    case 'daily':   return abs * 365;
    case 'weekly':  return abs * 52;
    case 'monthly': return abs * 12;
    case 'yearly':  return abs;
    default:        return abs;
  }
}

function monthlyCents(item: RecurringItem): number {
  return Math.round(annualCents(item) / 12);
}


export default function SubscriptionsScreen({ accounts, onRefresh }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.listRecurringItems());
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleMarkPaid = async (id: number, label: string) => {
    try {
      await api.markRecurringPaid(id);
      showToast(t('subscriptions.toast.markedPaid', { label }), 'success');
      await load();
      onRefresh?.();
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const handleSkip = async (id: number, label: string) => {
    try {
      await api.skipRecurring(id);
      showToast(t('subscriptions.toast.skipped', { label }), 'success');
      await load();
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const accName = (id: number) => accounts.find((a) => a.id === id)?.name ?? '—';

  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysLater = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
  const isDueNow  = (d: string) => d <= today;
  const isDueSoon = (d: string) => d > today && d <= sevenDaysLater;

  // Only show expense subscriptions (negative amounts); sort by annual cost desc
  const subscriptions = [...items]
    .filter((i) => i.amount_cents < 0)
    .sort((a, b) => annualCents(b) - annualCents(a));

  const totalAnnual  = subscriptions.reduce((s, i) => s + annualCents(i), 0);
  const totalMonthly = subscriptions.reduce((s, i) => s + monthlyCents(i), 0);

  if (loading) return <div className="text-slate-400 text-sm p-2">{t('common.loading')}</div>;

  return (
    <div className="space-y-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-800">{t('subscriptions.title')}</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-sm text-slate-500 mb-1">{t('subscriptions.annualCost')}</p>
          <p className="text-3xl font-bold tabular-nums text-red-600">{formatCents(totalAnnual)}</p>
          <p className="text-xs text-slate-400 mt-1">{t('subscriptions.activeCount', { count: subscriptions.length })}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-sm text-slate-500 mb-1">{t('subscriptions.monthlyAverage')}</p>
          <p className="text-3xl font-bold tabular-nums text-red-600">{formatCents(totalMonthly)}</p>
          <p className="text-xs text-slate-400 mt-1">{t('subscriptions.estimatedFrom')}</p>
        </div>
      </div>

      {/* List */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-700">{t('subscriptions.allSubscriptions')}</h2>
        </div>
        {subscriptions.length === 0 ? (
          <p className="text-slate-400 text-sm p-6">{t('subscriptions.empty')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('subscriptions.table.name')}</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('subscriptions.table.frequency')}</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('subscriptions.table.amount')}</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('subscriptions.table.annualCost')}</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('subscriptions.table.nextDue')}</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{item.label}</span>
                      {isDueNow(item.next_due_date) && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">{t('subscriptions.due')}</span>
                      )}
                      {isDueSoon(item.next_due_date) && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">{t('subscriptions.soon')}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{accName(item.account_id)}</p>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{t(`frequencies.${item.frequency}`, { defaultValue: item.frequency })}</td>
                  <td className="px-6 py-3 text-right font-semibold tabular-nums text-red-600">
                    {formatCents(item.amount_cents)}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-slate-700">
                    {formatCents(annualCents(item))}
                  </td>
                  <td className="px-6 py-3 text-slate-600 tabular-nums">{item.next_due_date}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => handleMarkPaid(item.id, item.label)}
                        className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-md hover:bg-emerald-100"
                      >
                        {t('common.markPaid')}
                      </button>
                      <button
                        onClick={() => handleSkip(item.id, item.label)}
                        className="text-xs bg-slate-50 text-slate-600 border border-slate-200 px-2 py-1 rounded-md hover:bg-slate-100"
                      >
                        {t('common.skip')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-slate-700">{t('subscriptions.table.total')}</td>
                <td className="px-6 py-3 text-right font-bold tabular-nums text-red-600">
                  {formatCents(totalMonthly)}<span className="text-xs font-normal text-slate-400">{t('subscriptions.perMonth')}</span>
                </td>
                <td className="px-6 py-3 text-right font-bold tabular-nums text-red-600">
                  {formatCents(totalAnnual)}<span className="text-xs font-normal text-slate-400">{t('subscriptions.perYear')}</span>
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </section>
    </div>
  );
}
