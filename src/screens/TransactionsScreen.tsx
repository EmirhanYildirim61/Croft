import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { api } from '../lib/tauri';
import { formatCents } from '../lib/format';
import { useToast } from '../context/toast';
import Modal from '../components/Modal';
import type { Transaction, AccountWithBalance, Category } from '../types';

interface Props {
  month: string;
  filterAccountId: number | null;
  onClearAccount: () => void;
  openNewTxTrigger: number;
  initialSearch?: string;
  accounts: AccountWithBalance[];
  categories: Category[];
  onRefresh: () => void;
}

interface FormErrors {
  date?: string;
  amount?: string;
  payee?: string;
  account?: string;
}

function validateForm(
  fDate: string,
  fAmount: string,
  fPayee: string,
  fAccId: number | null,
): FormErrors {
  const errors: FormErrors = {};
  if (!fDate) {
    errors.date = 'transactions.form.dateRequired';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(fDate)) {
    errors.date = 'transactions.form.dateInvalid';
  }
  if (!fAmount.trim()) {
    errors.amount = 'transactions.form.amountRequired';
  } else if (isNaN(parseFloat(fAmount))) {
    errors.amount = 'transactions.form.amountInvalid';
  }
  if (!fPayee.trim()) {
    errors.payee = 'transactions.form.payeeRequired';
  }
  if (fAccId === null) {
    errors.account = 'transactions.form.accountRequired';
  }
  return errors;
}

export default function TransactionsScreen({
  month,
  filterAccountId,
  onClearAccount,
  openNewTxTrigger,
  accounts,
  categories,
  onRefresh,
}: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCatIds, setFilterCatIds] = useState<number[]>([]);
  const [filterAccId, setFilterAccId] = useState<number | null>(filterAccountId);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDateRange, setShowDateRange] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [fDate, setFDate] = useState(new Date().toISOString().slice(0, 10));
  const [fAmount, setFAmount] = useState('');
  const [fPayee, setFPayee] = useState('');
  const [fCatId, setFCatId] = useState<number | null>(null);
  const [fAccId, setFAccId] = useState<number | null>(null);
  const [fNote, setFNote] = useState('');
  const [fType, setFType] = useState<'expense' | 'income'>('expense');
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const [showCatPicker, setShowCatPicker] = useState(false);
  const catPickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setFilterAccId(filterAccountId); }, [filterAccountId]);

  useEffect(() => {
    if (filterAccId !== null && accounts.length > 0 && !accounts.some((a) => a.id === filterAccId)) {
      setFilterAccId(null);
      onClearAccount();
    }
  }, [filterAccId, accounts, onClearAccount]);

  useEffect(() => {
    if (!showCatPicker) return;
    const handler = (e: MouseEvent) => {
      if (catPickerRef.current && !catPickerRef.current.contains(e.target as Node)) {
        setShowCatPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCatPicker]);

  const load = useCallback(async () => {
    try {
      const effectiveMonth = (showDateRange && (dateFrom || dateTo)) ? null : month;
      const txns = await api.listTransactions(
        filterAccId,
        effectiveMonth,
        null,
        filterCatIds.length > 0 ? filterCatIds : null,
        search || null,
        showDateRange && dateFrom ? dateFrom : null,
        showDateRange && dateTo ? dateTo : null,
      );
      setTransactions(txns);
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [filterAccId, month, filterCatIds, search, dateFrom, dateTo, showDateRange, showToast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (openNewTxTrigger > 0 && !showForm) {
      openAdd();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNewTxTrigger]);

  const openAdd = () => {
    setEditing(null);
    setFDate(new Date().toISOString().slice(0, 10));
    setFAmount('');
    setFPayee('');
    setFCatId(null);
    const seededAccId =
      filterAccId !== null && accounts.some((a) => a.id === filterAccId)
        ? filterAccId
        : (accounts[0]?.id ?? null);
    setFAccId(seededAccId);
    setFNote('');
    setFType('expense');
    setFormErrors({});
    setShowForm(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setFDate(tx.date);
    setFAmount((Math.abs(tx.amount_cents) / 100).toFixed(2));
    setFType(tx.amount_cents >= 0 ? 'income' : 'expense');
    setFPayee(tx.payee);
    setFCatId(tx.category_id);
    setFAccId(tx.account_id);
    setFNote(tx.note);
    setFormErrors({});
    setShowForm(true);
  };

  const handleSave = async () => {
    const errors = validateForm(fDate, fAmount, fPayee, fAccId);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setSaving(true);
    const rawAmt = Math.abs(parseFloat(fAmount));
    const cents = Math.round(rawAmt * 100) * (fType === 'expense' ? -1 : 1);
    try {
      if (editing) {
        await api.updateTransaction(editing.id, fDate, cents, fPayee.trim(), fCatId, fNote);
        showToast(t('transactions.toast.updated'), 'success');
      } else {
        await api.addTransaction(fAccId!, fDate, cents, fPayee.trim(), fCatId, fNote);
        showToast(t('transactions.toast.added'), 'success');
      }
      setShowForm(false);
      await load();
      onRefresh();
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteTransaction(deleteTarget.id);
      setDeleteTarget(null);
      showToast(t('transactions.toast.deleted'), 'success');
      await load();
      onRefresh();
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const catName = (id: number | null) =>
    id ? (categories.find((c) => c.id === id)?.name ?? '—') : '—';

  const catColor = (id: number | null) =>
    id ? (categories.find((c) => c.id === id)?.color ?? '#6B7280') : '#6B7280';

  const accName = (id: number) =>
    accounts.find((a) => a.id === id)?.name ?? '—';

  const visible = transactions;

  if (loading) return <div className="text-slate-400 text-sm p-2">{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">{t('transactions.title')}</h1>
          {filterAccId !== null && accounts.some((a) => a.id === filterAccId) && (
            <span className="flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full">
              {accName(filterAccId)}
              <button onClick={onClearAccount} className="ml-1 hover:text-indigo-900">✕</button>
            </span>
          )}
        </div>
        <button
          onClick={openAdd}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          {t('transactions.addButton')}
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('transactions.searchPlaceholder')}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
        />
        <select
          value={filterAccId ?? ''}
          onChange={(e) => { setFilterAccId(e.target.value ? Number(e.target.value) : null); onClearAccount(); }}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">{t('transactions.filterAllAccounts')}</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <div className="relative" ref={catPickerRef}>
          <button
            type="button"
            onClick={() => setShowCatPicker((v) => !v)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm hover:bg-slate-50 flex items-center gap-1.5 min-w-36 justify-between"
          >
            <span className={filterCatIds.length === 0 ? 'text-slate-500' : 'text-slate-700'}>
              {filterCatIds.length === 0
                ? t('transactions.filterAllCategories')
                : filterCatIds.length === 1
                  ? (categories.find((c) => c.id === filterCatIds[0])?.name ?? t('transactions.nSelected', { count: 1 }))
                  : t('transactions.nSelected', { count: filterCatIds.length })}
            </span>
            <span className="text-slate-400 text-xs">▾</span>
          </button>
          {showCatPicker && (
            <div className="absolute left-0 top-full mt-1 z-10 bg-white border border-slate-200 rounded-lg shadow-lg w-56 max-h-72 overflow-y-auto py-1">
              {categories.length === 0 ? (
                <p className="text-xs text-slate-400 px-3 py-2">{t('common.none')}.</p>
              ) : (
                categories.map((c) => {
                  const checked = filterCatIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setFilterCatIds((prev) =>
                            e.target.checked
                              ? [...prev, c.id]
                              : prev.filter((id) => id !== c.id),
                          );
                        }}
                        className="accent-indigo-600"
                      />
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="flex-1 text-slate-700">{c.name}</span>
                    </label>
                  );
                })
              )}
              {filterCatIds.length > 0 && (
                <button
                  onClick={() => setFilterCatIds([])}
                  className="w-full text-left text-xs text-indigo-600 hover:bg-slate-50 px-3 py-1.5 border-t border-slate-100"
                >
                  {t('transactions.clearSelection')}
                </button>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => { setShowDateRange((v) => !v); setDateFrom(''); setDateTo(''); }}
          className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
            showDateRange
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {t('transactions.dateRange')}
        </button>
        {showDateRange && (
          <>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-slate-400 text-sm">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-slate-500">{t('transactions.emptyText')}</p>
          {transactions.length === 0 && (
            <button onClick={openAdd} className="mt-4 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              {t('transactions.addFirst')}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('transactions.table.date')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('transactions.table.payee')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('transactions.table.category')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('transactions.table.account')}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('transactions.table.amount')}</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => openEdit(tx)}
                  className="hover:bg-slate-50 cursor-pointer group"
                >
                  <td className="px-4 py-3 text-slate-500">{tx.date}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {tx.payee || <span className="text-slate-400 italic">{t('transactions.noPayee')}</span>}
                    {tx.is_recurring && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">↻</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {tx.category_id ? (
                      <span
                        className="inline-block text-xs font-medium px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: catColor(tx.category_id) }}
                      >
                        {catName(tx.category_id)}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{accName(tx.account_id)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${tx.amount_cents >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {tx.amount_cents >= 0 ? '+' : ''}{formatCents(tx.amount_cents, accounts.find(a => a.id === tx.account_id)?.currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(tx); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <Modal title={editing ? t('transactions.form.editTitle') : t('transactions.form.addTitle')} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('transactions.form.typeLabel')}</label>
              <div className="flex rounded-lg overflow-hidden border border-slate-300">
                <button
                  type="button"
                  onClick={() => setFType('expense')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${fType === 'expense' ? 'bg-red-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  {t('transactions.form.expense')}
                </button>
                <button
                  type="button"
                  onClick={() => setFType('income')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${fType === 'income' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  {t('transactions.form.income')}
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('transactions.form.dateLabel')}</label>
                <input
                  type="date"
                  value={fDate}
                  onChange={(e) => { setFDate(e.target.value); setFormErrors((p) => ({ ...p, date: undefined })); }}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${formErrors.date ? 'border-red-400' : 'border-slate-300'}`}
                />
                {formErrors.date && <p className="mt-1 text-xs text-red-500">{t(formErrors.date)}</p>}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('transactions.form.amountLabel')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  autoFocus={!editing}
                  value={fAmount}
                  onChange={(e) => { setFAmount(e.target.value); setFormErrors((p) => ({ ...p, amount: undefined })); }}
                  placeholder="50.00"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${formErrors.amount ? 'border-red-400' : 'border-slate-300'}`}
                />
                {formErrors.amount && <p className="mt-1 text-xs text-red-500">{t(formErrors.amount)}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('transactions.form.payeeLabel')}</label>
              <input
                value={fPayee}
                onChange={(e) => { setFPayee(e.target.value); setFormErrors((p) => ({ ...p, payee: undefined })); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                placeholder={t('transactions.form.payeePlaceholder')}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${formErrors.payee ? 'border-red-400' : 'border-slate-300'}`}
              />
              {formErrors.payee && <p className="mt-1 text-xs text-red-500">{t(formErrors.payee)}</p>}
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('transactions.form.accountLabel')}</label>
                <select
                  value={fAccId ?? ''}
                  onChange={(e) => { setFAccId(Number(e.target.value)); setFormErrors((p) => ({ ...p, account: undefined })); }}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${formErrors.account ? 'border-red-400' : 'border-slate-300'}`}
                >
                  <option value="" disabled>{t('transactions.form.selectAccount')}</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                {formErrors.account && <p className="mt-1 text-xs text-red-500">{t(formErrors.account)}</p>}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('transactions.form.categoryLabel')}</label>
                <select
                  value={fCatId ?? ''}
                  onChange={(e) => setFCatId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t('common.none')}</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('transactions.form.noteLabel')}</label>
              <input
                value={fNote}
                onChange={(e) => setFNote(e.target.value)}
                placeholder={t('transactions.form.notePlaceholder')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? t('common.saving') : editing ? t('common.save') : t('transactions.form.saveButton')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm delete modal */}
      {deleteTarget && (
        <Modal title={t('transactions.deleteTitle')} onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-slate-600 mb-5">
            <Trans
              i18nKey="transactions.deleteConfirm"
              values={{
                payee: deleteTarget.payee || t('transactions.thisTransaction'),
                amount: formatCents(deleteTarget.amount_cents),
              }}
              components={{ bold: <strong /> }}
            />
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDelete}
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
