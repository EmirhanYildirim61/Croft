import { useState, useEffect, useCallback } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { api } from '../lib/tauri';
import { formatCents } from '../lib/format';
import { useToast } from '../context/toast';
import Modal from '../components/Modal';
import type { AccountWithBalance, AccountType } from '../types';

const CURRENCY_OPTIONS: { code: string; name: string }[] = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'RUB', name: 'Russian Ruble' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'CZK', name: 'Czech Koruna' },
  { code: 'HUF', name: 'Hungarian Forint' },
  { code: 'RON', name: 'Romanian Leu' },
  { code: 'BGN', name: 'Bulgarian Lev' },
  { code: 'UAH', name: 'Ukrainian Hryvnia' },
  { code: 'ILS', name: 'Israeli New Shekel' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'QAR', name: 'Qatari Riyal' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'BHD', name: 'Bahraini Dinar' },
  { code: 'OMR', name: 'Omani Rial' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'MAD', name: 'Moroccan Dirham' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'VND', name: 'Vietnamese Dong' },
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'BDT', name: 'Bangladeshi Taka' },
  { code: 'LKR', name: 'Sri Lankan Rupee' },
  { code: 'ARS', name: 'Argentine Peso' },
  { code: 'CLP', name: 'Chilean Peso' },
  { code: 'COP', name: 'Colombian Peso' },
  { code: 'PEN', name: 'Peruvian Sol' },
];

const ACCOUNT_TYPE_VALUES: AccountType[] = ['bank', 'credit', 'cash', 'savings'];

const TYPE_COLORS: Record<AccountType, string> = {
  bank: 'bg-blue-100 text-blue-700',
  credit: 'bg-red-100 text-red-700',
  cash: 'bg-emerald-100 text-emerald-700',
  savings: 'bg-purple-100 text-purple-700',
};

interface Props {
  onSelectAccount: (id: number) => void;
  onNetWorthChange: (cents: number) => void;
  onRefresh?: () => void;
}

export default function AccountsScreen({ onSelectAccount, onNetWorthChange, onRefresh }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<AccountWithBalance | null>(null);

  const [name, setName] = useState('');
  const [accType, setAccType] = useState<AccountType>('bank');
  const [currency, setCurrency] = useState('USD');
  const [initialBalance, setInitialBalance] = useState('0.00');
  const [saving, setSaving] = useState(false);

  const [nameError, setNameError] = useState('');
  const [balanceError, setBalanceError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.listAccounts();
      setAccounts(data);
      const netWorth = data.reduce((s, a) => s + a.current_balance, 0);
      onNetWorthChange(netWorth);
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [onNetWorthChange, showToast]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    let hasError = false;
    if (!name.trim()) { setNameError(t('accounts.addModal.nameRequired')); hasError = true; }
    const balNum = parseFloat(initialBalance);
    if (isNaN(balNum)) { setBalanceError(t('accounts.addModal.balanceInvalid')); hasError = true; }
    if (hasError) return;

    setSaving(true);
    try {
      const cents = Math.round(balNum * 100);
      await api.createAccount(name.trim(), accType, currency.trim() || 'USD', cents);
      setShowAdd(false);
      setName(''); setAccType('bank'); setCurrency('USD'); setInitialBalance('0.00');
      setNameError(''); setBalanceError('');
      showToast(t('accounts.toast.created'), 'success');
      await load();
      onRefresh?.();
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteAccount(deleteTarget.id);
      setDeleteTarget(null);
      showToast(t('accounts.toast.deleted'), 'success');
      await load();
      onRefresh?.();
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  if (loading) return <div className="text-slate-400 text-sm p-2">{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t('accounts.title')}</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          {t('accounts.addButton')}
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">🏦</div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">{t('accounts.emptyTitle')}</h2>
          <p className="text-slate-500 mb-6 max-w-xs">{t('accounts.emptyBody')}</p>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            {t('accounts.addModal.title')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              onClick={() => onSelectAccount(acc.id)}
              className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[acc.type as AccountType]}`}>
                    {t(`accounts.types.${acc.type}`, { defaultValue: acc.type })}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(acc); }}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all text-lg leading-none"
                  title={t('accounts.deleteTooltip')}
                >
                  ✕
                </button>
              </div>
              <p className="font-semibold text-slate-800 text-lg mb-1 truncate">{acc.name}</p>
              <p className={`text-2xl font-bold ${acc.current_balance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                {formatCents(acc.current_balance, acc.currency)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {t('accounts.initialBalance', { amount: formatCents(acc.initial_balance, acc.currency), currency: acc.currency })}
              </p>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title={t('accounts.addModal.title')} onClose={() => { setShowAdd(false); setNameError(''); setBalanceError(''); }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('accounts.addModal.nameLabel')}</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                placeholder={t('accounts.addModal.namePlaceholder')}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${nameError ? 'border-red-400' : 'border-slate-300'}`}
              />
              {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('accounts.addModal.typeLabel')}</label>
              <select
                value={accType}
                onChange={(e) => setAccType(e.target.value as AccountType)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ACCOUNT_TYPE_VALUES.map((v) => (
                  <option key={v} value={v}>{t(`accounts.types.${v}`)}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('accounts.addModal.currencyLabel')}</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CURRENCY_OPTIONS.map(({ code, name: cname }) => (
                    <option key={code} value={code}>{code} – {cname}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('accounts.addModal.balanceLabel')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={initialBalance}
                  onChange={(e) => { setInitialBalance(e.target.value); setBalanceError(''); }}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${balanceError ? 'border-red-400' : 'border-slate-300'}`}
                />
                {balanceError && <p className="mt-1 text-xs text-red-500">{balanceError}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowAdd(false); setNameError(''); setBalanceError(''); }}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? t('common.saving') : t('accounts.addModal.saveButton')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title={t('accounts.deleteTitle')} onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-slate-600 mb-5">
            <Trans
              i18nKey="accounts.deleteConfirm"
              values={{ name: deleteTarget.name }}
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
