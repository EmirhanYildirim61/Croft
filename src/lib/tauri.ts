import { invoke } from '@tauri-apps/api/core';
import type {
  AccountWithBalance,
  BudgetSummaryRow,
  Category,
  CsvPreviewRow,
  ImportRow,
  NetWorthPoint,
  RecurringItem,
  Transaction,
} from '../types';

export const api = {
  // Accounts
  createAccount: (name: string, accountType: string, currency: string, initialBalance: number) =>
    invoke<number>('create_account', { name, accountType, currency, initialBalance }),

  listAccounts: () => invoke<AccountWithBalance[]>('list_accounts'),

  deleteAccount: (id: number) => invoke<void>('delete_account', { id }),

  // Transactions
  addTransaction: (
    accountId: number,
    date: string,
    amountCents: number,
    payee: string,
    categoryId: number | null,
    note: string,
  ) => invoke<number>('add_transaction', { accountId, date, amountCents, payee, categoryId, note }),

  listTransactions: (accountId?: number | null, month?: string | null, categoryId?: number | null) =>
    invoke<Transaction[]>('list_transactions', {
      accountId: accountId ?? null,
      month: month ?? null,
      categoryId: categoryId ?? null,
    }),

  updateTransaction: (
    id: number,
    date: string,
    amountCents: number,
    payee: string,
    categoryId: number | null,
    note: string,
  ) => invoke<void>('update_transaction', { id, date, amountCents, payee, categoryId, note }),

  deleteTransaction: (id: number) => invoke<void>('delete_transaction', { id }),

  // Categories
  listCategories: () => invoke<Category[]>('list_categories'),

  addCategory: (name: string, parentId: number | null, color: string) =>
    invoke<number>('add_category', { name, parentId, color }),

  // Budgets
  setBudget: (categoryId: number, month: string, amountCents: number) =>
    invoke<void>('set_budget', { categoryId, month, amountCents }),

  getBudgetSummary: (month: string) => invoke<BudgetSummaryRow[]>('get_budget_summary', { month }),

  // Recurring
  addRecurringItem: (
    label: string,
    accountId: number,
    categoryId: number | null,
    amountCents: number,
    frequency: string,
    nextDueDate: string,
  ) =>
    invoke<number>('add_recurring_item', {
      label,
      accountId,
      categoryId,
      amountCents,
      frequency,
      nextDueDate,
    }),

  listRecurringItems: () => invoke<RecurringItem[]>('list_recurring_items'),

  generateDueRecurringTransactions: () => invoke<number>('generate_due_recurring_transactions'),

  // Reports
  getNetWorthHistory: () => invoke<NetWorthPoint[]>('get_net_worth_history'),

  // Export
  exportToCsv: (path: string) => invoke<void>('export_to_csv', { path }),
  exportToJson: (path: string) => invoke<void>('export_to_json', { path }),

  // Import
  importCsv: (path: string) => invoke<CsvPreviewRow[]>('import_csv', { path }),
  confirmCsvImport: (rows: ImportRow[]) => invoke<number>('confirm_csv_import', { rows }),
};
