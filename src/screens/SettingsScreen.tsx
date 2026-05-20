import { useState, useEffect, useCallback } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { api } from '../lib/tauri';
import { formatCents } from '../lib/format';
import Modal from '../components/Modal';
import type { Category, RecurringItem, AccountWithBalance, Frequency } from '../types';

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

interface Props {
  accounts: AccountWithBalance[];
}

export default function SettingsScreen({ accounts }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add category form
  const [showAddCat, setShowAddCat] = useState(false);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#6B7280');
  const [catParent, setCatParent] = useState<number | null>(null);
  const [savingCat, setSavingCat] = useState(false);

  // Add recurring form
  const [showAddRec, setShowAddRec] = useState(false);
  const [rLabel, setRLabel] = useState('');
  const [rAccId, setRAccId] = useState<number | null>(null);
  const [rCatId, setRCatId] = useState<number | null>(null);
  const [rAmount, setRAmount] = useState('');
  const [rFreq, setRFreq] = useState<Frequency>('monthly');
  const [rNextDate, setRNextDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingRec, setSavingRec] = useState(false);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const load = useCallback(async () => {
    try {
      const [cats, recs] = await Promise.all([api.listCategories(), api.listRecurringItems()]);
      setCategories(cats);
      setRecurring(recs);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAddCategory = async () => {
    if (!catName.trim()) return;
    setSavingCat(true);
    try {
      await api.addCategory(catName.trim(), catParent, catColor);
      setCatName(''); setCatColor('#6B7280'); setCatParent(null);
      setShowAddCat(false);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSavingCat(false);
    }
  };

  const handleAddRecurring = async () => {
    if (!rLabel.trim() || !rAmount || rAccId === null) return;
    setSavingRec(true);
    const cents = Math.round(parseFloat(rAmount) * 100);
    try {
      await api.addRecurringItem(rLabel.trim(), rAccId, rCatId, cents, rFreq, rNextDate);
      setRLabel(''); setRAmount(''); setRFreq('monthly');
      setRNextDate(new Date().toISOString().slice(0, 10));
      setRCatId(null);
      setShowAddRec(false);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSavingRec(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const path = await save({ filters: [{ name: 'CSV', extensions: ['csv'] }], defaultPath: 'transactions.csv' });
      if (!path) return;
      await api.exportToCsv(path);
      showSuccess('CSV exported successfully.');
    } catch (e) {
      setError(String(e));
    }
  };

  const handleExportJson = async () => {
    try {
      const path = await save({ filters: [{ name: 'JSON', extensions: ['json'] }], defaultPath: 'finance-data.json' });
      if (!path) return;
      await api.exportToJson(path);
      showSuccess('JSON exported successfully.');
    } catch (e) {
      setError(String(e));
    }
  };

  const accName = (id: number) => accounts.find((a) => a.id === id)?.name ?? '—';

  if (loading) return <div className="text-slate-400 text-sm p-2">Loading…</div>;

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800">Settings</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3 text-sm">
          {successMsg}
        </div>
      )}

      {/* Export */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Export Data</h2>
        <div className="flex gap-3">
          <button
            onClick={handleExportCsv}
            className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors"
          >
            Export transactions as CSV
          </button>
          <button
            onClick={handleExportJson}
            className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors"
          >
            Export all data as JSON
          </button>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-700">Categories</h2>
          <button
            onClick={() => setShowAddCat(true)}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
          >
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
              <span
                className="w-4 h-4 rounded-full shrink-0 border border-white shadow-sm"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-sm text-slate-700 flex-1">{cat.name}</span>
              {cat.parent_id && (
                <span className="text-xs text-slate-400">
                  sub of {categories.find((c) => c.id === cat.parent_id)?.name}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Recurring Items */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-700">Recurring Items</h2>
          <button
            onClick={() => { setRAccId(accounts[0]?.id ?? null); setShowAddRec(true); }}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
            disabled={accounts.length === 0}
          >
            + Add
          </button>
        </div>
        {recurring.length === 0 ? (
          <p className="text-slate-400 text-sm">No recurring items yet.</p>
        ) : (
          <div className="space-y-2">
            {recurring.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{item.label}</p>
                  <p className="text-xs text-slate-400">
                    {item.frequency} · next: {item.next_due_date} · {accName(item.account_id)}
                  </p>
                </div>
                <span className={`text-sm font-semibold tabular-nums ${item.amount_cents >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {item.amount_cents >= 0 ? '+' : ''}{formatCents(item.amount_cents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add Category Modal */}
      {showAddCat && (
        <Modal title="Add Category" onClose={() => setShowAddCat(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input
                autoFocus
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                placeholder="e.g. Gym & Fitness"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="h-9 w-14 rounded border border-slate-300 cursor-pointer"
                  />
                  <span className="text-sm text-slate-500">{catColor}</span>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Parent (optional)</label>
                <select
                  value={catParent ?? ''}
                  onChange={(e) => setCatParent(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">None (top-level)</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowAddCat(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleAddCategory}
                disabled={!catName.trim() || savingCat}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingCat ? 'Saving…' : 'Add Category'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Recurring Modal */}
      {showAddRec && (
        <Modal title="Add Recurring Item" onClose={() => setShowAddRec(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Label *</label>
              <input
                autoFocus
                value={rLabel}
                onChange={(e) => setRLabel(e.target.value)}
                placeholder="e.g. Netflix, Rent"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={rAmount}
                  onChange={(e) => setRAmount(e.target.value)}
                  placeholder="−15.99"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Frequency *</label>
                <select
                  value={rFreq}
                  onChange={(e) => setRFreq(e.target.value as Frequency)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Account *</label>
                <select
                  value={rAccId ?? ''}
                  onChange={(e) => setRAccId(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Next Due Date *</label>
                <input
                  type="date"
                  value={rNextDate}
                  onChange={(e) => setRNextDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={rCatId ?? ''}
                onChange={(e) => setRCatId(e.target.value ? Number(e.target.value) : null)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowAddRec(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleAddRecurring}
                disabled={!rLabel.trim() || !rAmount || rAccId === null || savingRec}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingRec ? 'Saving…' : 'Add Recurring Item'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
