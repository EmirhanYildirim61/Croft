import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/tauri';
import { formatCents } from '../lib/format';
import Modal from '../components/Modal';
import type { Transaction, AccountWithBalance, Category } from '../types';

interface Props {
  month: string;
  filterAccountId: number | null;
  onClearAccount: () => void;
}

export default function TransactionsScreen({ month, filterAccountId, onClearAccount }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCatId, setFilterCatId] = useState<number | null>(null);
  const [filterAccId, setFilterAccId] = useState<number | null>(filterAccountId);

  // Add/edit modal
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [fDate, setFDate] = useState(new Date().toISOString().slice(0, 10));
  const [fAmount, setFAmount] = useState('');
  const [fPayee, setFPayee] = useState('');
  const [fCatId, setFCatId] = useState<number | null>(null);
  const [fAccId, setFAccId] = useState<number | null>(null);
  const [fNote, setFNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setFilterAccId(filterAccountId); }, [filterAccountId]);

  const load = useCallback(async () => {
    try {
      const [txns, accs, cats] = await Promise.all([
        api.listTransactions(filterAccId, month, filterCatId),
        api.listAccounts(),
        api.listCategories(),
      ]);
      setTransactions(txns);
      setAccounts(accs);
      setCategories(cats);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [filterAccId, month, filterCatId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setFDate(new Date().toISOString().slice(0, 10));
    setFAmount('');
    setFPayee('');
    setFCatId(null);
    setFAccId(filterAccId ?? accounts[0]?.id ?? null);
    setFNote('');
    setShowForm(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setFDate(tx.date);
    setFAmount((Math.abs(tx.amount_cents) / 100).toFixed(2));
    setFPayee(tx.payee);
    setFCatId(tx.category_id);
    setFAccId(tx.account_id);
    setFNote(tx.note);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!fPayee.trim() || !fAmount || fAccId === null) return;
    setSaving(true);
    const rawAmt = parseFloat(fAmount);
    const cents = Math.round((isNaN(rawAmt) ? 0 : rawAmt) * 100);
    try {
      if (editing) {
        await api.updateTransaction(editing.id, fDate, cents, fPayee.trim(), fCatId, fNote);
      } else {
        await api.addTransaction(fAccId!, fDate, cents, fPayee.trim(), fCatId, fNote);
      }
      setShowForm(false);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await api.deleteTransaction(id);
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const catName = (id: number | null) =>
    id ? (categories.find((c) => c.id === id)?.name ?? '—') : '—';

  const catColor = (id: number | null) =>
    id ? (categories.find((c) => c.id === id)?.color ?? '#6B7280') : '#6B7280';

  const accName = (id: number) =>
    accounts.find((a) => a.id === id)?.name ?? '—';

  const visible = transactions.filter((tx) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      tx.payee.toLowerCase().includes(q) ||
      tx.note.toLowerCase().includes(q) ||
      catName(tx.category_id).toLowerCase().includes(q)
    );
  });

  if (loading) return <div className="text-slate-400 text-sm p-2">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">Transactions</h1>
          {filterAccId !== null && (
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
          + Add Transaction
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search payee, note…"
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
        />
        <select
          value={filterAccId ?? ''}
          onChange={(e) => { setFilterAccId(e.target.value ? Number(e.target.value) : null); onClearAccount(); }}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All accounts</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select
          value={filterCatId ?? ''}
          onChange={(e) => setFilterCatId(e.target.value ? Number(e.target.value) : null)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-slate-500">No transactions found.</p>
          {transactions.length === 0 && (
            <button onClick={openAdd} className="mt-4 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              Add your first transaction
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Account</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
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
                    {tx.payee || <span className="text-slate-400 italic">No payee</span>}
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
                      onClick={(e) => { e.stopPropagation(); handleDelete(tx.id); }}
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

      {showForm && (
        <Modal title={editing ? 'Edit Transaction' : 'Add Transaction'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={fDate}
                  onChange={(e) => setFDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  autoFocus={!editing}
                  value={fAmount}
                  onChange={(e) => setFAmount(e.target.value)}
                  placeholder="−50.00 or 1200.00"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payee *</label>
              <input
                value={fPayee}
                onChange={(e) => setFPayee(e.target.value)}
                placeholder="e.g. Whole Foods"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Account *</label>
                <select
                  value={fAccId ?? ''}
                  onChange={(e) => setFAccId(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>Select…</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={fCatId ?? ''}
                  onChange={(e) => setFCatId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">None</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Note</label>
              <input
                value={fNote}
                onChange={(e) => setFNote(e.target.value)}
                placeholder="Optional note"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!fPayee.trim() || !fAmount || fAccId === null || saving}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Transaction'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
