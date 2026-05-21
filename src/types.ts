export type AccountType = 'bank' | 'credit' | 'cash' | 'savings';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  currency: string;
  initial_balance: number;
  created_at: string;
}

export interface AccountWithBalance extends Account {
  current_balance: number;
}

export interface Transaction {
  id: number;
  account_id: number;
  date: string;
  amount_cents: number;
  payee: string;
  category_id: number | null;
  note: string;
  is_recurring: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  color: string;
}

export interface Budget {
  id: number;
  category_id: number;
  month: string;
  amount_cents: number;
}

export interface BudgetSummaryRow {
  category_id: number;
  category_name: string;
  color: string;
  budgeted_cents: number;
  spent_cents: number;
}

export interface RecurringItem {
  id: number;
  account_id: number;
  category_id: number | null;
  amount_cents: number;
  frequency: Frequency;
  next_due_date: string;
  label: string;
}

export interface NetWorthPoint {
  month: string;
  total_cents: number;
}

export interface CsvPreviewRow {
  row_index: number;
  date: string;
  payee: string;
  amount_cents: number;
  suggested_category_id: number | null;
  note: string;
}

export interface ImportRow {
  account_id: number;
  date: string;
  amount_cents: number;
  payee: string;
  category_id: number | null;
  note: string;
}

export interface AccountNetWorthRow {
  id: number;
  name: string;
  type: string;
  currency: string;
  current_balance: number;
  prev_month_balance: number;
}

export interface MonthComparisonRow {
  category_id: number;
  category_name: string;
  color: string;
  month_a_cents: number;
  month_b_cents: number;
}

export interface SpendingRow {
  category_id: number;
  category_name: string;
  color: string;
  spent_cents: number;
}

export interface ExchangeRate {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at: string;
}
