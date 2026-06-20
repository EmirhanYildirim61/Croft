use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Account {
    pub id: i64,
    pub name: String,
    #[sqlx(rename = "type")]
    #[serde(rename = "type")]
    pub account_type: String,
    pub currency: String,
    pub initial_balance: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AccountWithBalance {
    pub id: i64,
    pub name: String,
    #[sqlx(rename = "type")]
    #[serde(rename = "type")]
    pub account_type: String,
    pub currency: String,
    pub initial_balance: i64,
    pub created_at: String,
    pub current_balance: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Transaction {
    pub id: i64,
    pub account_id: i64,
    pub date: String,
    pub amount_cents: i64,
    pub payee: String,
    pub category_id: Option<i64>,
    pub note: String,
    pub is_recurring: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub parent_id: Option<i64>,
    pub color: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Budget {
    pub id: i64,
    pub category_id: i64,
    pub month: String,
    pub amount_cents: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct BudgetSummaryRow {
    pub category_id: i64,
    pub category_name: String,
    pub color: String,
    pub budgeted_cents: i64,
    pub spent_cents: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct RecurringItem {
    pub id: i64,
    pub account_id: i64,
    pub category_id: Option<i64>,
    pub amount_cents: i64,
    pub frequency: String,
    pub next_due_date: String,
    pub label: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NetWorthPoint {
    pub month: String,
    pub total_cents: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CsvPreviewRow {
    pub row_index: usize,
    pub date: String,
    pub payee: String,
    pub amount_cents: i64,
    pub suggested_category_id: Option<i64>,
    pub note: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportRow {
    pub account_id: i64,
    pub date: String,
    pub amount_cents: i64,
    pub payee: String,
    pub category_id: Option<i64>,
    pub note: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportData {
    pub accounts: Vec<Account>,
    pub categories: Vec<Category>,
    pub transactions: Vec<Transaction>,
    pub budgets: Vec<Budget>,
    pub recurring_items: Vec<RecurringItem>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AccountNetWorthRow {
    pub id: i64,
    pub name: String,
    #[sqlx(rename = "type")]
    #[serde(rename = "type")]
    pub account_type: String,
    pub currency: String,
    pub current_balance: i64,
    pub prev_month_balance: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MonthComparisonRow {
    pub category_id: i64,
    pub category_name: String,
    pub color: String,
    pub month_a_cents: i64,
    pub month_b_cents: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpendingRow {
    pub category_id: i64,
    pub category_name: String,
    pub color: String,
    pub spent_cents: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryMonthlyPoint {
    pub month: String,
    pub income_cents: i64,
    pub spent_cents: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ExchangeRate {
    pub id: i64,
    pub from_currency: String,
    pub to_currency: String,
    pub rate: f64,
    pub updated_at: String,
}
