import { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { open } from '@tauri-apps/plugin-dialog';
import { api } from '../lib/tauri';
import { formatCents } from '../lib/format';
import { useToast } from '../context/toast';
import type { CsvPreviewRow, ImportRow, AccountWithBalance, Category } from '../types';

interface Props {
  accounts: AccountWithBalance[];
  categories: Category[];
  onRefresh?: () => void;
}

type ImportFormat = 'generic' | 'ynab' | 'qif';

const FORMAT_OPTIONS: { value: ImportFormat; exts: string[] }[] = [
  { value: 'generic', exts: ['csv'] },
  { value: 'ynab',    exts: ['csv'] },
  { value: 'qif',     exts: ['qif'] },
];

export default function ImportScreen({ accounts, categories, onRefresh }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [format, setFormat] = useState<ImportFormat>('generic');
  const [preview, setPreview] = useState<CsvPreviewRow[]>([]);
  const [rowMeta, setRowMeta] = useState<Record<number, { accountId: number; categoryId: number | null }>>({});
  const [step, setStep] = useState<'idle' | 'preview' | 'done'>('idle');
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const handlePickFile = async () => {
    const fmt = FORMAT_OPTIONS.find((f) => f.value === format)!;
    try {
      const path = await open({
        filters: [{ name: t(`import.formats.${format}.label`), extensions: fmt.exts }],
        multiple: false,
      });
      if (!path) return;

      let rows: CsvPreviewRow[];
      if (format === 'ynab') {
        rows = await api.importYnabCsv(path as string);
      } else if (format === 'qif') {
        rows = await api.importQif(path as string);
      } else {
        rows = await api.importCsv(path as string);
      }

      setPreview(rows);
      const defaultAccId = accounts[0]?.id ?? 0;
      const meta: Record<number, { accountId: number; categoryId: number | null }> = {};
      for (const row of rows) {
        meta[row.row_index] = {
          accountId: defaultAccId,
          categoryId: row.suggested_category_id,
        };
      }
      setRowMeta(meta);
      setStep('preview');
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const handleConfirm = async () => {
    setImporting(true);
    try {
      const importRows: ImportRow[] = preview.map((row) => ({
        account_id: rowMeta[row.row_index]?.accountId ?? accounts[0]?.id ?? 0,
        date: row.date,
        amount_cents: row.amount_cents,
        payee: row.payee,
        category_id: rowMeta[row.row_index]?.categoryId ?? null,
        note: row.note,
      }));
      const count = await api.confirmCsvImport(importRows);
      setImportedCount(count);
      setStep('done');
      onRefresh?.();
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setPreview([]);
    setRowMeta({});
    setStep('idle');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">{t('import.title')}</h1>

      {step === 'idle' && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-6xl mb-4">📂</div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">{t('import.idle.title')}</h2>
          <p className="text-slate-500 mb-6 max-w-sm">{t('import.idle.body')}</p>

          {/* Format selector */}
          <div className="flex gap-3 mb-6">
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFormat(opt.value)}
                className={`px-4 py-2.5 rounded-xl border text-sm font-medium text-left transition-colors ${
                  format === opt.value
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold">{t(`import.formats.${opt.value}.label`)}</div>
                <div className={`text-xs mt-0.5 ${format === opt.value ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {t(`import.formats.${opt.value}.desc`)}
                </div>
              </button>
            ))}
          </div>

          {accounts.length === 0 ? (
            <p className="text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              {t('import.idle.noAccount')}
            </p>
          ) : (
            <button
              onClick={handlePickFile}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              {t('import.idle.chooseFile')}
            </button>
          )}
        </div>
      )}

      {step === 'preview' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600">
              <Trans
                i18nKey="import.preview.info"
                values={{ count: preview.length }}
                components={{ bold: <strong /> }}
              />
            </p>
            <div className="flex gap-3">
              <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-800">
                {t('import.preview.startOver')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={importing || accounts.length === 0}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {importing ? t('import.preview.importing') : t('import.preview.importCount', { count: preview.length })}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('import.table.date')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('import.table.payee')}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('import.table.amount')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('import.table.account')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('import.table.category')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.map((row) => (
                  <tr key={row.row_index} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-2.5 text-slate-700 max-w-xs truncate">{row.payee || '—'}</td>
                    <td className={`px-4 py-2.5 text-right font-medium tabular-nums ${row.amount_cents >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {row.amount_cents >= 0 ? '+' : ''}{formatCents(row.amount_cents)}
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={rowMeta[row.row_index]?.accountId ?? ''}
                        onChange={(e) =>
                          setRowMeta((prev) => ({
                            ...prev,
                            [row.row_index]: { ...prev[row.row_index], accountId: Number(e.target.value) },
                          }))
                        }
                        className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={rowMeta[row.row_index]?.categoryId ?? ''}
                        onChange={(e) =>
                          setRowMeta((prev) => ({
                            ...prev,
                            [row.row_index]: {
                              ...prev[row.row_index],
                              categoryId: e.target.value ? Number(e.target.value) : null,
                            },
                          }))
                        }
                        className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">{t('common.none')}</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">{t('import.done.title')}</h2>
          <p className="text-slate-500 mb-6">{t('import.done.body', { count: importedCount })}</p>
          <button onClick={reset} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700">
            {t('import.done.importAnother')}
          </button>
        </div>
      )}
    </div>
  );
}
