import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { api } from '../lib/tauri';
import { formatCents } from '../lib/format';
import type { CsvPreviewRow, ImportRow, AccountWithBalance, Category } from '../types';

interface Props {
  accounts: AccountWithBalance[];
  categories: Category[];
}

export default function ImportScreen({ accounts, categories }: Props) {
  const [preview, setPreview] = useState<CsvPreviewRow[]>([]);
  const [rowMeta, setRowMeta] = useState<Record<number, { accountId: number; categoryId: number | null }>>({});
  const [step, setStep] = useState<'idle' | 'preview' | 'done'>('idle');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [importedCount, setImportedCount] = useState(0);

  const handlePickFile = async () => {
    setError('');
    try {
      const path = await open({
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
        multiple: false,
      });
      if (!path) return;
      const rows = await api.importCsv(path as string);
      setPreview(rows);
      // Initialise row metadata with defaults
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
      setError(String(e));
    }
  };

  const handleConfirm = async () => {
    setImporting(true);
    setError('');
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
    } catch (e) {
      setError(String(e));
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setPreview([]);
    setRowMeta({});
    setStep('idle');
    setError('');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">CSV Import</h1>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {step === 'idle' && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">📂</div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Import transactions from CSV</h2>
          <p className="text-slate-500 mb-6 max-w-sm">
            Pick a CSV file exported from your bank. Columns are auto-detected (date, payee/description, amount).
          </p>
          {accounts.length === 0 ? (
            <p className="text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              You need at least one account before importing.
            </p>
          ) : (
            <button
              onClick={handlePickFile}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Choose CSV File…
            </button>
          )}
        </div>
      )}

      {step === 'preview' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600">
              Found <strong>{preview.length}</strong> rows. Assign accounts and categories, then confirm.
            </p>
            <div className="flex gap-3">
              <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-800">
                ← Start over
              </button>
              <button
                onClick={handleConfirm}
                disabled={importing || accounts.length === 0}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {importing ? 'Importing…' : `Import ${preview.length} transactions`}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Payee / Description</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Account</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
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
                        <option value="">None</option>
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
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Import complete!</h2>
          <p className="text-slate-500 mb-6">
            {importedCount} transaction{importedCount !== 1 ? 's' : ''} added successfully.
          </p>
          <button onClick={reset} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700">
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}
