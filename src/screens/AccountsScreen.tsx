import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/tauri';
import { formatCents } from '../lib/format';
import Modal from '../components/Modal';
import type { AccountWithBalance, AccountType } from '../types';

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'bank', label: 'Bank' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'savings', label: 'Savings' },
];

const TYPE_COLORS: Record<AccountType, string> = {
  bank: 'bg-blue-100 text-blue-700',
  credit: 'bg-red-100 text-red-700',
  cash: 'bg-emerald-100 text-emerald-700',
  savings: 'bg-purple-100 text-purple-700',
};

interface Props {
  onSelectAccount: (id: number) => void;
  onNetWorthChange: (cents: number) => void;
}

export default function AccountsScreen({ onSelectAccount, onNetWorthChange }: Props) {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add form state
  const [name, setName] = useState('');
  const [accType, setAccType] = useState<AccountType>('bank');
  const [currency, setCurrency] = useState('USD');
  const [initialBalance, setInitialBalance] = useState('0.00');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listAccounts();
      setAccounts(data);
      const netWorth = data.reduce((s, a) => s + a.current_balance, 0);
      onNetWorthChange(netWorth);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [onNetWorthChange]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const cents = Math.round(parseFloat(initialBalance || '0') * 100);
      await api.createAccount(name.trim(), accType, currency.trim() || 'USD', cents);
      setShowAdd(false);
      setName(''); setAccType('bank'); setCurrency('USD'); setInitialBalance('0.00');
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this account and all its transactions?')) return;
    try {
      await api.deleteAccount(id);
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  if (loading) return <div className="text-slate-400 text-sm p-2">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Accounts</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Add Account
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">🏦</div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">No accounts yet</h2>
          <p className="text-slate-500 mb-6 max-w-xs">
            Add your first account to start tracking your finances.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Add Account
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
                    {ACCOUNT_TYPES.find((t) => t.value === acc.type)?.label ?? acc.type}
                  </span>
                </div>
                <button
                  onClick={(e) => handleDelete(acc.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all text-lg leading-none"
                  title="Delete account"
                >
                  ✕
                </button>
              </div>
              <p className="font-semibold text-slate-800 text-lg mb-1 truncate">{acc.name}</p>
              <p className={`text-2xl font-bold ${acc.current_balance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                {formatCents(acc.current_balance, acc.currency)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Initial: {formatCents(acc.initial_balance, acc.currency)} · {acc.currency}
              </p>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Account" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                placeholder="e.g. Chase Checking"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
              <select
                value={accType}
                onChange={(e) => setAccType(e.target.value as AccountType)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                <input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  maxLength={3}
                  placeholder="USD"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Starting Balance</label>
                <input
                  type="number"
                  step="0.01"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!name.trim() || saving}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Add Account'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
