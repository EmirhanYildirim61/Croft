import { invoke } from '@tauri-apps/api/core';
import type {
  AccountNetWorthRow,
  AccountWithBalance,
  BudgetSummaryRow,
  Category,
  CsvPreviewRow,
  ExchangeRate,
  ImportRow,
  MonthComparisonRow,
  NetWorthPoint,
  RecurringItem,
  SpendingRow,
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

  listTransactions: (
    accountId?: number | null,
    month?: string | null,
    categoryId?: number | null,
    categoryIds?: number[] | null,
    search?: string | null,
    dateFrom?: string | null,
    dateTo?: string | null,
  ) =>
    invoke<Transaction[]>('list_transactions', {
      accountId: accountId ?? null,
      month: month ?? null,
      categoryId: categoryId ?? null,
      categoryIds: categoryIds ?? null,
      search: search ?? null,
      dateFrom: dateFrom ?? null,
      dateTo: dateTo ?? null,
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

  updateCategory: (id: number, name: string, parentId: number | null, color: string) =>
    invoke<void>('update_category', { id, name, parentId, color }),

  deleteCategory: (id: number) => invoke<void>('delete_category', { id }),

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

  updateRecurringItem: (
    id: number,
    label: string,
    accountId: number,
    categoryId: number | null,
    amountCents: number,
    frequency: string,
    nextDueDate: string,
  ) =>
    invoke<void>('update_recurring_item', {
      id,
      label,
      accountId,
      categoryId,
      amountCents,
      frequency,
      nextDueDate,
    }),

  deleteRecurringItem: (id: number) => invoke<void>('delete_recurring_item', { id }),

  generateDueRecurringTransactions: () => invoke<number>('generate_due_recurring_transactions'),

  markRecurringPaid: (id: number) => invoke<void>('mark_recurring_paid', { id }),

  skipRecurring: (id: number) => invoke<void>('skip_recurring', { id }),

  // Reports
  getNetWorthHistory: () => invoke<NetWorthPoint[]>('get_net_worth_history'),

  getNetWorthDetail: () => invoke<AccountNetWorthRow[]>('get_net_worth_detail'),

  getSpendingByDateRange: (dateFrom: string, dateTo: string) =>
    invoke<SpendingRow[]>('get_spending_by_date_range', { dateFrom, dateTo }),

  getMonthComparison: (monthA: string, monthB: string) =>
    invoke<MonthComparisonRow[]>('get_month_comparison', { monthA, monthB }),

  // Export
  exportToCsv: (path: string) => invoke<void>('export_to_csv', { path }),
  exportToJson: (path: string) => invoke<void>('export_to_json', { path }),

  // Import
  importCsv: (path: string) => invoke<CsvPreviewRow[]>('import_csv', { path }),
  importYnabCsv: (path: string) => invoke<CsvPreviewRow[]>('import_ynab_csv', { path }),
  importQif: (path: string) => invoke<CsvPreviewRow[]>('import_qif', { path }),
  confirmCsvImport: (rows: ImportRow[]) => invoke<number>('confirm_csv_import', { rows }),

  // Settings
  getDbPath: () => invoke<string>('get_db_path'),
  moveDb: (newFolder: string) => invoke<string>('move_db', { newFolder }),

  // Currency
  listExchangeRates: () => invoke<ExchangeRate[]>('list_exchange_rates'),
  setExchangeRate: (fromCurrency: string, toCurrency: string, rate: number) =>
    invoke<void>('set_exchange_rate', { fromCurrency, toCurrency, rate }),
  deleteExchangeRate: (id: number) => invoke<void>('delete_exchange_rate', { id }),
};
