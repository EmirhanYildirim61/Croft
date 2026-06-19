import { useState, useEffect, useCallback } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { api } from '../lib/tauri';
import { formatCents } from '../lib/format';
import { useToast } from '../context/toast';
import Modal from '../components/Modal';
import type { Category, RecurringItem, AccountWithBalance, Frequency } from '../types';

const FREQUENCY_VALUES: Frequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

interface Props {
  accounts: AccountWithBalance[];
  onRefresh?: () => void;
}

export default function RecurringScreen({ accounts, onRefresh }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddRec, setShowAddRec] = useState(false);
  const [editingRec, setEditingRec] = useState<RecurringItem | null>(null);
  const [rLabel, setRLabel] = useState('');
  const [rAccId, setRAccId] = useState<number | null>(null);
  const [rCatId, setRCatId] = useState<number | null>(null);
  const [rAmount, setRAmount] = useState('');
  const [rFreq, setRFreq] = useState<Frequency>('monthly');
  const [rNextDate, setRNextDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingRec, setSavingRec] = useState(false);
  const [recErrors, setRecErrors] = useState<{ label?: string; amount?: string; account?: string }>({});
  const [deleteRecTarget, setDeleteRecTarget] = useState<RecurringItem | null>(null);

  const load = useCallback(async () => {
    try {
      const [recs, cats] = await Promise.all([
        api.listRecurringItems(),
        api.listCategories(),
      ]);
      setRecurring(recs);
      setCategories(cats);
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openAddRecurring = () => {
    setEditingRec(null);
    setRLabel(''); setRAmount(''); setRFreq('monthly');
    setRNextDate(new Date().toISOString().slice(0, 10));
    setRAccId(accounts[0]?.id ?? null);
    setRCatId(null); setRecErrors({});
    setShowAddRec(true);
  };

  const openEditRecurring = (item: RecurringItem) => {
    setEditingRec(item);
    setRLabel(item.label);
    if (item.amount_cents < 0) {
      setRAmount('-' + (Math.abs(item.amount_cents) / 100).toFixed(2));
    } else {
      setRAmount((item.amount_cents / 100).toFixed(2));
    }
    setRFreq(item.frequency);
    setRNextDate(item.next_due_date);
    setRAccId(item.account_id);
    setRCatId(item.category_id);
    setRecErrors({});
    setShowAddRec(true);
  };

  const handleAddRecurring = async () => {
    const errors: typeof recErrors = {};
    if (!rLabel.trim()) errors.label = t('settings.recurring.addModal.labelRequired');
    if (!rAmount || isNaN(parseFloat(rAmount))) errors.amount = t('settings.recurring.addModal.amountInvalid');
    if (rAccId === null) errors.account = t('settings.recurring.addModal.accountRequired');
    if (Object.keys(errors).length > 0) { setRecErrors(errors); return; }

    setSavingRec(true);
    const cents = Math.round(parseFloat(rAmount) * 100);
    try {
      if (editingRec) {
        await api.updateRecurringItem(editingRec.id, rLabel.trim(), rAccId!, rCatId, cents, rFreq, rNextDate);
        showToast(t('settings.recurring.toast.updated'), 'success');
      } else {
        await api.addRecurringItem(rLabel.trim(), rAccId!, rCatId, cents, rFreq, rNextDate);
        showToast(t('settings.recurring.toast.added'), 'success');
      }
      setRLabel(''); setRAmount(''); setRFreq('monthly');
      setRNextDate(new Date().toISOString().slice(0, 10));
      setRCatId(null); setRecErrors({});
      setShowAddRec(false);
      setEditingRec(null);
      await load();
      onRefresh?.();
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setSavingRec(false);
    }
  };

  const handleDeleteRecurring = async () => {
    if (!deleteRecTarget) return;
    try {
      await api.deleteRecurringItem(deleteRecTarget.id);
      setDeleteRecTarget(null);
      showToast(t('settings.recurring.toast.deleted'), 'success');
      await load();
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const handleMarkPaid = async (id: number, label: string) => {
    try {
      await api.markRecurringPaid(id);
      showToast(t('settings.recurring.toast.markedPaid', { label }), 'success');
      await load();
      onRefresh?.();
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const handleSkip = async (id: number, label: string) => {
    try {
      await api.skipRecurring(id);
      showToast(t('settings.recurring.toast.skipped', { label }), 'success');
      await load();
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const accName = (id: number) => accounts.find((a) => a.id === id)?.name ?? '—';

  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysLater = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
  const isDueNow = (d: string) => d <= today;
  const isDueSoon = (d: string) => d > today && d <= sevenDaysLater;

  if (loading) return <div className="text-slate-400 text-sm p-2">{t('common.loading')}</div>;

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800">{t('settings.recurring.title')}</h1>

      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-700">{t('settings.recurring.title')}</h2>
          <button
            onClick={openAddRecurring}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
            disabled={accounts.length === 0}
          >
            {t('common.add')}
          </button>
        </div>
        {recurring.length === 0 ? (
          <p className="text-slate-400 text-sm">{t('settings.recurring.empty')}</p>
        ) : (
          <div className="space-y-2">
            {recurring.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-700 truncate">{item.label}</p>
                    {isDueNow(item.next_due_date) && (
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">{t('settings.recurring.due')}</span>
                    )}
                    {isDueSoon(item.next_due_date) && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">{t('settings.recurring.dueSoon')}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {t('settings.recurring.frequencyNext', {
                      frequency: t(`frequencies.${item.frequency}`, { defaultValue: item.frequency }),
                      date: item.next_due_date,
                      account: accName(item.account_id),
                    })}
                  </p>
                </div>
                <span className={`text-sm font-semibold tabular-nums shrink-0 ${item.amount_cents >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {item.amount_cents >= 0 ? '+' : ''}{formatCents(item.amount_cents)}
                </span>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handleMarkPaid(item.id, item.label)}
                    className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors"
                    title={t('settings.recurring.markPaidTooltip')}
                  >
                    {t('common.markPaid')}
                  </button>
                  <button
                    onClick={() => handleSkip(item.id, item.label)}
                    className="text-xs bg-slate-50 text-slate-600 border border-slate-200 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
                    title={t('settings.recurring.skipTooltip')}
                  >
                    {t('common.skip')}
                  </button>
                  <button
                    onClick={() => openEditRecurring(item)}
                    className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-md hover:bg-slate-50"
                    title={t('settings.recurring.editTooltip')}
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => setDeleteRecTarget(item)}
                    className="text-xs bg-white border border-red-200 text-red-600 px-2 py-1 rounded-md hover:bg-red-50"
                    title={t('settings.recurring.deleteTooltip')}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add/Edit Recurring Modal */}
      {showAddRec && (
        <Modal
          title={editingRec ? t('settings.recurring.addModal.editTitle') : t('settings.recurring.addModal.addTitle')}
          onClose={() => { setShowAddRec(false); setEditingRec(null); setRecErrors({}); }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.recurring.addModal.labelLabel')}</label>
              <input
                autoFocus
                value={rLabel}
                onChange={(e) => { setRLabel(e.target.value); setRecErrors((p) => ({ ...p, label: undefined })); }}
                placeholder={t('settings.recurring.addModal.labelPlaceholder')}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${recErrors.label ? 'border-red-400' : 'border-slate-300'}`}
              />
              {recErrors.label && <p className="mt-1 text-xs text-red-500">{recErrors.label}</p>}
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.recurring.addModal.amountLabel')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={rAmount}
                  onChange={(e) => { setRAmount(e.target.value); setRecErrors((p) => ({ ...p, amount: undefined })); }}
                  placeholder={t('settings.recurring.addModal.amountPlaceholder')}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${recErrors.amount ? 'border-red-400' : 'border-slate-300'}`}
                />
                {recErrors.amount && <p className="mt-1 text-xs text-red-500">{recErrors.amount}</p>}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.recurring.addModal.frequencyLabel')}</label>
                <select
                  value={rFreq}
                  onChange={(e) => setRFreq(e.target.value as Frequency)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {FREQUENCY_VALUES.map((v) => (
                    <option key={v} value={v}>{t(`frequencies.${v}`)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.recurring.addModal.accountLabel')}</label>
                <select
                  value={rAccId ?? ''}
                  onChange={(e) => { setRAccId(Number(e.target.value)); setRecErrors((p) => ({ ...p, account: undefined })); }}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${recErrors.account ? 'border-red-400' : 'border-slate-300'}`}
                >
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                {recErrors.account && <p className="mt-1 text-xs text-red-500">{recErrors.account}</p>}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.recurring.addModal.nextDueLabel')}</label>
                <input
                  type="date"
                  value={rNextDate}
                  onChange={(e) => setRNextDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.recurring.addModal.categoryLabel')}</label>
              <select
                value={rCatId ?? ''}
                onChange={(e) => setRCatId(e.target.value ? Number(e.target.value) : null)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">{t('common.none')}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowAddRec(false); setEditingRec(null); setRecErrors({}); }}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddRecurring}
                disabled={savingRec}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingRec ? t('common.saving') : editingRec ? t('common.save') : t('settings.recurring.addModal.saveButton')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete recurring item confirmation */}
      {deleteRecTarget && (
        <Modal title={t('settings.recurring.deleteModal.title')} onClose={() => setDeleteRecTarget(null)}>
          <p className="text-sm text-slate-600 mb-5">
            <Trans
              i18nKey="settings.recurring.deleteModal.confirm"
              values={{ label: deleteRecTarget.label }}
              components={{ bold: <strong /> }}
            />
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteRecTarget(null)}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDeleteRecurring}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              {t('common.delete')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
