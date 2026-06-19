import { useState, useEffect, useCallback } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { save, open as openDialog } from '@tauri-apps/plugin-dialog';
import { api } from '../lib/tauri';
import { useToast } from '../context/toast';
import Modal from '../components/Modal';
import { LANGUAGES } from '../lib/languages';
import type { Category, ExchangeRate } from '../types';

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

const DISPLAY_CURRENCY_KEY = 'display_currency';

interface Props {
  onRefresh?: () => void;
}

export default function SettingsScreen({ onRefresh }: Props) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddCat, setShowAddCat] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#6B7280');
  const [catParent, setCatParent] = useState<number | null>(null);
  const [savingCat, setSavingCat] = useState(false);
  const [catNameError, setCatNameError] = useState('');
  const [deleteCatTarget, setDeleteCatTarget] = useState<Category | null>(null);

  const [dbPath, setDbPath] = useState('');
  const [movingDb, setMovingDb] = useState(false);

  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [showAddRate, setShowAddRate] = useState(false);
  const [rateFrom, setRateFrom] = useState('EUR');
  const [rateTo, setRateTo] = useState('USD');
  const [rateValue, setRateValue] = useState('');
  const [savingRate, setSavingRate] = useState(false);

  const [displayCurrency, setDisplayCurrency] = useState(
    () => localStorage.getItem(DISPLAY_CURRENCY_KEY) ?? 'USD',
  );

  const load = useCallback(async () => {
    try {
      const [cats, path, rates] = await Promise.all([
        api.listCategories(),
        api.getDbPath(),
        api.listExchangeRates(),
      ]);
      setCategories(cats);
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
    if (!catName.trim()) { setCatNameError(t('settings.categories.addModal.nameRequired')); return; }
    setSavingCat(true);
    try {
      if (editingCat) {
        await api.updateCategory(editingCat.id, catName.trim(), catParent, catColor);
        showToast(t('settings.categories.toast.updated'), 'success');
      } else {
        await api.addCategory(catName.trim(), catParent, catColor);
        showToast(t('settings.categories.toast.added'), 'success');
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
      showToast(t('settings.categories.toast.deleted'), 'success');
      await load();
      onRefresh?.();
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
      showToast(t('settings.toast.csvExported'), 'success');
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
      showToast(t('settings.toast.jsonExported'), 'success');
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
      showToast(t('settings.toast.dbMoved'), 'success');
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setMovingDb(false);
    }
  };

  const handleCurrencyChange = (code: string) => {
    setDisplayCurrency(code);
    localStorage.setItem(DISPLAY_CURRENCY_KEY, code);
    showToast(t('settings.toast.currencySet', { code }), 'success');
  };

  const handleAddRate = async () => {
    const r = parseFloat(rateValue);
    if (!rateFrom) { showToast(t('settings.exchangeRates.addModal.invalidFrom'), 'error'); return; }
    if (!rateValue || isNaN(r) || r <= 0) { showToast(t('settings.exchangeRates.addModal.invalidRate'), 'error'); return; }
    setSavingRate(true);
    try {
      await api.setExchangeRate(rateFrom.trim().toUpperCase(), rateTo.trim().toUpperCase(), r);
      setRateFrom('EUR'); setRateValue('');
      setShowAddRate(false);
      showToast(t('settings.exchangeRates.toast.saved'), 'success');
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
      showToast(t('settings.exchangeRates.toast.removed'), 'success');
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const handleLanguageChange = (code: string) => {
    const lang = LANGUAGES.find((l) => l.code === code);
    localStorage.setItem('language', code);
    i18n.changeLanguage(code);
    showToast(t('settings.language.changed', { label: lang?.label ?? code }), 'success');
  };

  if (loading) return <div className="text-slate-400 text-sm p-2">{t('common.loading')}</div>;

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800">{t('settings.title')}</h1>

      {/* Language */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-700 mb-1">{t('settings.language.title')}</h2>
        <p className="text-xs text-slate-400 mb-4">{t('settings.language.hint')}</p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                i18n.language === lang.code
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {lang.flag && (
                <img src={lang.flag} alt={lang.label} className="w-6 h-auto rounded-sm shrink-0" />
              )}
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Export */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-700 mb-4">{t('settings.export.title')}</h2>
        <div className="flex gap-3">
          <button
            onClick={handleExportCsv}
            className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors"
          >
            {t('settings.export.csv')}
          </button>
          <button
            onClick={handleExportJson}
            className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors"
          >
            {t('settings.export.json')}
          </button>
        </div>
      </section>

      {/* Database location */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-700 mb-1">{t('settings.database.title')}</h2>
        <p className="text-xs text-slate-400 mb-4">{t('settings.database.hint')}</p>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 truncate">
            {dbPath || '—'}
          </code>
          <button
            onClick={() => { if (dbPath) navigator.clipboard.writeText(dbPath); }}
            title={t('settings.database.copyTitle')}
            className="text-xs border border-slate-300 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 shrink-0"
          >
            {t('settings.database.copy')}
          </button>
          <button
            onClick={handleMoveDb}
            disabled={movingDb}
            className="text-xs bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 shrink-0"
          >
            {movingDb ? t('settings.database.moving') : t('settings.database.move')}
          </button>
        </div>
      </section>

      {/* Currency display format */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-700 mb-1">{t('settings.displayCurrency.title')}</h2>
        <p className="text-xs text-slate-400 mb-4">{t('settings.displayCurrency.hint')}</p>
        <select
          value={displayCurrency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72"
        >
          {CURRENCY_OPTIONS.map(({ code, name }) => (
            <option key={code} value={code}>{code} – {name}</option>
          ))}
        </select>
      </section>

      {/* Exchange Rates */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-slate-700">{t('settings.exchangeRates.title')}</h2>
          <button
            onClick={() => { setRateTo(displayCurrency); setShowAddRate(true); }}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
          >
            {t('common.add')}
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-4">{t('settings.exchangeRates.hint')}</p>
        {exchangeRates.length === 0 ? (
          <p className="text-slate-400 text-sm">{t('settings.exchangeRates.empty')}</p>
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
                  {t('common.remove')}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-700">{t('settings.categories.title')}</h2>
          <button
            onClick={openAddCategory}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
          >
            {t('common.add')}
          </button>
        </div>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0"
            >
              <span
                className="w-4 h-4 rounded-full shrink-0 border border-white shadow-sm"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-sm text-slate-700 flex-1">{cat.name}</span>
              {cat.parent_id && (
                <span className="text-xs text-slate-400">
                  {t('settings.categories.subOf', { parent: categories.find((c) => c.id === cat.parent_id)?.name })}
                </span>
              )}
              <div className="flex gap-1.5">
                <button
                  onClick={() => openEditCategory(cat)}
                  className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-md hover:bg-slate-50"
                >
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => setDeleteCatTarget(cat)}
                  className="text-xs bg-white border border-red-200 text-red-600 px-2 py-1 rounded-md hover:bg-red-50"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Add Exchange Rate Modal */}
      {showAddRate && (
        <Modal title={t('settings.exchangeRates.addModal.title')} onClose={() => setShowAddRate(false)}>
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              <Trans
                i18nKey="settings.exchangeRates.addModal.hint"
                values={{ to: rateTo }}
                components={{ bold: <strong /> }}
              />
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.exchangeRates.addModal.fromLabel')}</label>
                <select
                  autoFocus
                  value={rateFrom}
                  onChange={(e) => setRateFrom(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CURRENCY_OPTIONS.map(({ code, name }) => (
                    <option key={code} value={code}>{code} – {name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.exchangeRates.addModal.toLabel')}</label>
                <select
                  value={rateTo}
                  onChange={(e) => setRateTo(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CURRENCY_OPTIONS.map(({ code, name }) => (
                    <option key={code} value={code}>{code} – {name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.exchangeRates.addModal.rateLabel')}</label>
              <input
                type="number"
                step="any"
                min="0.000001"
                value={rateValue}
                onChange={(e) => setRateValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddRate(); }}
                placeholder={t('settings.exchangeRates.addModal.ratePlaceholder')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowAddRate(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">{t('common.cancel')}</button>
              <button
                onClick={handleAddRate}
                disabled={savingRate}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingRate ? t('common.saving') : t('settings.exchangeRates.addModal.saveButton')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add/Edit Category Modal */}
      {showAddCat && (
        <Modal
          title={editingCat ? t('settings.categories.addModal.editTitle') : t('settings.categories.addModal.addTitle')}
          onClose={() => { setShowAddCat(false); setEditingCat(null); setCatNameError(''); }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.categories.addModal.nameLabel')}</label>
              <input
                autoFocus
                value={catName}
                onChange={(e) => { setCatName(e.target.value); setCatNameError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                placeholder={t('settings.categories.addModal.namePlaceholder')}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${catNameError ? 'border-red-400' : 'border-slate-300'}`}
              />
              {catNameError && <p className="mt-1 text-xs text-red-500">{catNameError}</p>}
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.categories.addModal.colorLabel')}</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.categories.addModal.parentLabel')}</label>
                <select
                  value={catParent ?? ''}
                  onChange={(e) => setCatParent(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t('settings.categories.addModal.parentNone')}</option>
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
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddCategory}
                disabled={savingCat}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingCat ? t('common.saving') : editingCat ? t('common.save') : t('settings.categories.addModal.saveButton')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete category confirmation */}
      {deleteCatTarget && (
        <Modal title={t('settings.categories.deleteModal.title')} onClose={() => setDeleteCatTarget(null)}>
          <p className="text-sm text-slate-600 mb-5">
            <Trans
              i18nKey="settings.categories.deleteModal.confirm"
              values={{ name: deleteCatTarget.name }}
              components={{ bold: <strong /> }}
            />
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteCatTarget(null)}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDeleteCategory}
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
