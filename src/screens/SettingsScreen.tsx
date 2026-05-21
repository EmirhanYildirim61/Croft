import { useState, useEffect, useCallback } from 'react';
import { save, open as openDialog } from '@tauri-apps/plugin-dialog';
import { api } from '../lib/tauri';
import { formatCents } from '../lib/format';
import { useToast } from '../context/toast';
import Modal from '../components/Modal';
import type { Category, ExchangeRate, RecurringItem, AccountWithBalance, Frequency } from '../types';

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

// Common currency codes shown in the picker
const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'TRY', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'];

const DISPLAY_CURRENCY_KEY = 'display_currency';

interface Props {
  accounts: AccountWithBalance[];
  onRefresh?: () => void;
}

export default function SettingsScreen({ accounts, onRefresh }: Props) {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/edit category form
  const [showAddCat, setShowAddCat] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#6B7280');
  const [catParent, setCatParent] = useState<number | null>(null);
  const [savingCat, setSavingCat] = useState(false);
  const [catNameError, setCatNameError] = useState('');
  const [deleteCatTarget, setDeleteCatTarget] = useState<Category | null>(null);

  // Add/edit recurring form
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

  // DB path
  const [dbPath, setDbPath] = useState('');
  const [movingDb, setMovingDb] = useState(false);

  // Exchange rates
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [showAddRate, setShowAddRate] = useState(false);
  const [rateFrom, setRateFrom] = useState('');
  const [rateTo, setRateTo] = useState('USD');
  const [rateValue, setRateValue] = useState('');
  const [savingRate, setSavingRate] = useState(false);

  // Currency display preference (stored in localStorage)
  const [displayCurrency, setDisplayCurrency] = useState(
    () => localStorage.getItem(DISPLAY_CURRENCY_KEY) ?? 'USD',
  );

  const load = useCallback(async () => {
    try {
      const [cats, recs, path, rates] = await Promise.all([
        api.listCategories(),
        api.listRecurringItems(),
        api.getDbPath(),
        api.listExchangeRates(),
      ]);
      setCategories(cats);
      setRecurring(recs);
      setDbPath(path);
      setExchangeRates(rates);
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openAddCategory = () => {
    setEditingCat(null);
    setCatName(''); setCatColor('#6B7280'); setCatParent(null); setCatNameError('');
    setShowAddCat(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatColor(cat.color);
    setCatParent(cat.parent_id);
    setCatNameError('');
    setShowAddCat(true);
  };

  const handleAddCategory = async () => {
    if (!catName.trim()) { setCatNameError('Category name is required.'); return; }
    setSavingCat(true);
    try {
      if (editingCat) {
        await api.updateCategory(editingCat.id, catName.trim(), catParent, catColor);
        showToast('Category updated.', 'success');
      } else {
        await api.addCategory(catName.trim(), catParent, catColor);
        showToast('Category added.', 'success');
      }
      setCatName(''); setCatColor('#6B7280'); setCatParent(null); setCatNameError('');
      setShowAddCat(false);
      setEditingCat(null);
      await load();
      onRefresh?.();
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCatTarget) return;
    try {
      await api.deleteCategory(deleteCatTarget.id);
      setDeleteCatTarget(null);
      showToast('Category deleted.', 'success');
      await load();
      onRefresh?.();
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

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
    setRAmount((Math.abs(item.amount_cents) / 100).toFixed(2));
    // Preserve the sign by storing the negative sign in the input
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
    if (!rLabel.trim()) errors.label = 'Label is required.';
    if (!rAmount || isNaN(parseFloat(rAmount))) errors.amount = 'Enter a valid amount.';
    if (rAccId === null) errors.account = 'Select an account.';
    if (Object.keys(errors).length > 0) { setRecErrors(errors); return; }

    setSavingRec(true);
    const cents = Math.round(parseFloat(rAmount) * 100);
    try {
      if (editingRec) {
        await api.updateRecurringItem(editingRec.id, rLabel.trim(), rAccId!, rCatId, cents, rFreq, rNextDate);
        showToast('Recurring item updated.', 'success');
      } else {
        await api.addRecurringItem(rLabel.trim(), rAccId!, rCatId, cents, rFreq, rNextDate);
        showToast('Recurring item added.', 'success');
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
      showToast('Recurring item deleted.', 'success');
      await load();
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const recordBackup = () =>
    localStorage.setItem('last_backup_date', new Date().toISOString().slice(0, 10));

  const handleExportCsv = async () => {
    try {
      const path = await save({ filters: [{ name: 'CSV', extensions: ['csv'] }], defaultPath: 'transactions.csv' });
      if (!path) return;
      await api.exportToCsv(path);
      recordBackup();
      showToast('CSV exported successfully.', 'success');
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const handleExportJson = async () => {
    try {
      const path = await save({ filters: [{ name: 'JSON', extensions: ['json'] }], defaultPath: 'finance-data.json' });
      if (!path) return;
      await api.exportToJson(path);
      recordBackup();
      showToast('JSON exported successfully.', 'success');
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const handleMoveDb = async () => {
    try {
      const folder = await openDialog({ directory: true, multiple: false });
      if (!folder) return;
      setMovingDb(true);
      const newPath = await api.moveDb(folder as string);
      setDbPath(newPath);
      showToast('Database copied. Restart the app to use the new location.', 'success');
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setMovingDb(false);
    }
  };

  const handleCurrencyChange = (code: string) => {
    setDisplayCurrency(code);
    localStorage.setItem(DISPLAY_CURRENCY_KEY, code);
    showToast(`Display currency set to ${code}.`, 'success');
  };

  const handleAddRate = async () => {
    const r = parseFloat(rateValue);
    if (!rateFrom.trim()) { showToast('Enter the source currency code.', 'error'); return; }
    if (!rateValue || isNaN(r) || r <= 0) { showToast('Enter a positive rate.', 'error'); return; }
    setSavingRate(true);
    try {
      await api.setExchangeRate(rateFrom.trim().toUpperCase(), rateTo.trim().toUpperCase(), r);
      setRateFrom(''); setRateValue('');
      setShowAddRate(false);
      showToast('Exchange rate saved.', 'success');
      setExchangeRates(await api.listExchangeRates());
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setSavingRate(false);
    }
  };

  const handleDeleteRate = async (id: number) => {
    try {
      await api.deleteExchangeRate(id);
      setExchangeRates((prev) => prev.filter((r) => r.id !== id));
      showToast('Exchange rate removed.', 'success');
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const handleMarkPaid = async (id: number, label: string) => {
    try {
      await api.markRecurringPaid(id);
      showToast(`Marked "${label}" as paid.`, 'success');
      await load();
      onRefresh?.();
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const handleSkip = async (id: number, label: string) => {
    try {
      await api.skipRecurring(id);
      showToast(`Skipped "${label}" — next date advanced.`, 'success');
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

  if (loading) return <div className="text-slate-400 text-sm p-2">Loading…</div>;

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800">Settings</h1>

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

      {/* Database location */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-700 mb-1">Database File</h2>
        <p className="text-xs text-slate-400 mb-4">
          Your data is stored in a single SQLite file. Move it anywhere — a Dropbox folder, iCloud Drive, etc.
        </p>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 truncate">
            {dbPath || '—'}
          </code>
          <button
            onClick={() => { if (dbPath) navigator.clipboard.writeText(dbPath); }}
            title="Copy path"
            className="text-xs border border-slate-300 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 shrink-0"
          >
            Copy
          </button>
          <button
            onClick={handleMoveDb}
            disabled={movingDb}
            className="text-xs bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 shrink-0"
          >
            {movingDb ? 'Copying…' : 'Move…'}
          </button>
        </div>
      </section>

      {/* Currency display format */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-700 mb-1">Default Display Currency</h2>
        <p className="text-xs text-slate-400 mb-4">
          Used where no per-account currency is available (e.g. net worth summary).
        </p>
        <div className="flex flex-wrap gap-2">
          {CURRENCY_OPTIONS.map((code) => (
            <button
              key={code}
              onClick={() => handleCurrencyChange(code)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                displayCurrency === code
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {code}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Current: {formatCents(0, displayCurrency).replace('0.00', '').trim() || displayCurrency}
        </p>
      </section>

      {/* Exchange Rates */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-slate-700">Exchange Rates</h2>
          <button
            onClick={() => { setRateTo(displayCurrency); setShowAddRate(true); }}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
          >
            + Add
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Define manual rates so multi-currency accounts are converted to your base currency in Net Worth.
        </p>
        {exchangeRates.length === 0 ? (
          <p className="text-slate-400 text-sm">No exchange rates defined yet.</p>
        ) : (
          <div className="space-y-1">
            {exchangeRates.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <span className="text-sm font-medium text-slate-700 w-12">{r.from_currency}</span>
                <span className="text-slate-400 text-xs">→</span>
                <span className="text-sm text-slate-700 w-12">{r.to_currency}</span>
                <span className="text-sm tabular-nums text-slate-600 flex-1">= {r.rate}</span>
                <button
                  onClick={() => handleDeleteRate(r.id)}
                  className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5 rounded hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-700">Categories</h2>
          <button
            onClick={openAddCategory}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
          >
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0 group">
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
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEditCategory(cat)}
                  className="text-xs text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteCatTarget(cat)}
                  className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5 rounded hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recurring Items */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-700">Recurring Items</h2>
          <button
            onClick={openAddRecurring}
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
              <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-700 truncate">{item.label}</p>
                    {isDueNow(item.next_due_date) && (
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">Due</span>
                    )}
                    {isDueSoon(item.next_due_date) && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Due soon</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {item.frequency} · next: {item.next_due_date} · {accName(item.account_id)}
                  </p>
                </div>
                <span className={`text-sm font-semibold tabular-nums shrink-0 ${item.amount_cents >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {item.amount_cents >= 0 ? '+' : ''}{formatCents(item.amount_cents)}
                </span>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handleMarkPaid(item.id, item.label)}
                    className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors"
                    title="Record a transaction for this item and advance the due date"
                  >
                    Mark paid
                  </button>
                  <button
                    onClick={() => handleSkip(item.id, item.label)}
                    className="text-xs bg-slate-50 text-slate-600 border border-slate-200 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
                    title="Skip this occurrence and advance the due date without recording a transaction"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => openEditRecurring(item)}
                    className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-md hover:bg-slate-50"
                    title="Edit recurring item"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteRecTarget(item)}
                    className="text-xs bg-white border border-red-200 text-red-600 px-2 py-1 rounded-md hover:bg-red-50"
                    title="Delete recurring item"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add Exchange Rate Modal */}
      {showAddRate && (
        <Modal title="Add Exchange Rate" onClose={() => setShowAddRate(false)}>
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Enter how many units of <strong>{rateTo}</strong> equal 1 unit of the source currency.
              Example: 1 EUR = 1.08 USD → From: EUR, To: USD, Rate: 1.08
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">From currency *</label>
                <input
                  autoFocus
                  value={rateFrom}
                  onChange={(e) => setRateFrom(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddRate(); }}
                  placeholder="EUR"
                  maxLength={10}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">To currency *</label>
                <input
                  value={rateTo}
                  onChange={(e) => setRateTo(e.target.value.toUpperCase())}
                  placeholder="USD"
                  maxLength={10}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rate *</label>
              <input
                type="number"
                step="any"
                min="0.000001"
                value={rateValue}
                onChange={(e) => setRateValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddRate(); }}
                placeholder="1.08"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowAddRate(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleAddRate}
                disabled={savingRate}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingRate ? 'Saving…' : 'Save Rate'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add/Edit Category Modal */}
      {showAddCat && (
        <Modal
          title={editingCat ? 'Edit Category' : 'Add Category'}
          onClose={() => { setShowAddCat(false); setEditingCat(null); setCatNameError(''); }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input
                autoFocus
                value={catName}
                onChange={(e) => { setCatName(e.target.value); setCatNameError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                placeholder="e.g. Gym & Fitness"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${catNameError ? 'border-red-400' : 'border-slate-300'}`}
              />
              {catNameError && <p className="mt-1 text-xs text-red-500">{catNameError}</p>}
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
                  {categories
                    .filter((c) => !editingCat || c.id !== editingCat.id)
                    .map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowAddCat(false); setEditingCat(null); setCatNameError(''); }}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                disabled={savingCat}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingCat ? 'Saving…' : editingCat ? 'Save Changes' : 'Add Category'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete category confirmation */}
      {deleteCatTarget && (
        <Modal title="Delete Category" onClose={() => setDeleteCatTarget(null)}>
          <p className="text-sm text-slate-600 mb-5">
            Delete <strong>{deleteCatTarget.name}</strong>? Existing transactions will keep their category as "uncategorized".
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteCatTarget(null)}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteCategory}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}

      {/* Add/Edit Recurring Modal */}
      {showAddRec && (
        <Modal
          title={editingRec ? 'Edit Recurring Item' : 'Add Recurring Item'}
          onClose={() => { setShowAddRec(false); setEditingRec(null); setRecErrors({}); }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Label *</label>
              <input
                autoFocus
                value={rLabel}
                onChange={(e) => { setRLabel(e.target.value); setRecErrors((p) => ({ ...p, label: undefined })); }}
                placeholder="e.g. Netflix, Rent"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${recErrors.label ? 'border-red-400' : 'border-slate-300'}`}
              />
              {recErrors.label && <p className="mt-1 text-xs text-red-500">{recErrors.label}</p>}
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={rAmount}
                  onChange={(e) => { setRAmount(e.target.value); setRecErrors((p) => ({ ...p, amount: undefined })); }}
                  placeholder="−15.99"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${recErrors.amount ? 'border-red-400' : 'border-slate-300'}`}
                />
                {recErrors.amount && <p className="mt-1 text-xs text-red-500">{recErrors.amount}</p>}
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
                  onChange={(e) => { setRAccId(Number(e.target.value)); setRecErrors((p) => ({ ...p, account: undefined })); }}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${recErrors.account ? 'border-red-400' : 'border-slate-300'}`}
                >
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                {recErrors.account && <p className="mt-1 text-xs text-red-500">{recErrors.account}</p>}
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
              <button
                onClick={() => { setShowAddRec(false); setEditingRec(null); setRecErrors({}); }}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRecurring}
                disabled={savingRec}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingRec ? 'Saving…' : editingRec ? 'Save Changes' : 'Add Recurring Item'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete recurring item confirmation */}
      {deleteRecTarget && (
        <Modal title="Delete Recurring Item" onClose={() => setDeleteRecTarget(null)}>
          <p className="text-sm text-slate-600 mb-5">
            Delete <strong>{deleteRecTarget.label}</strong>? This stops the schedule but keeps any
            transactions already generated for it.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteRecTarget(null)}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteRecurring}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
