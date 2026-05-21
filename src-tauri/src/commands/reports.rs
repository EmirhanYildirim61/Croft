use crate::db::AppState;
use crate::models::{AccountNetWorthRow, MonthComparisonRow, NetWorthPoint, SpendingRow};
use chrono::{Datelike, Local, Months};
use tauri::State;

#[tauri::command]
pub async fn get_net_worth_history(
    state: State<'_, AppState>,
) -> Result<Vec<NetWorthPoint>, String> {
    let today = Local::now().date_naive();
    let mut results = Vec::with_capacity(12);

    // Produce 12 monthly data points: oldest first (11 months ago → current month)
    for i in (0..12u32).rev() {
        let month_date = today
            .checked_sub_months(Months::new(i))
            .ok_or_else(|| "date underflow".to_string())?;
        let month_str = format!("{}-{:02}", month_date.year(), month_date.month());

        // Exclusive upper bound: first day of the following month
        let next_month = month_date
            .checked_add_months(Months::new(1))
            .ok_or_else(|| "date overflow".to_string())?;
        let cutoff = format!("{}-{:02}-01", next_month.year(), next_month.month());

        let total: i64 = sqlx::query_scalar(
            "SELECT COALESCE((SELECT SUM(initial_balance) FROM accounts), 0)
                  + COALESCE((SELECT SUM(amount_cents) FROM transactions WHERE date < ?), 0)",
        )
        .bind(&cutoff)
        .fetch_one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

        results.push(NetWorthPoint { month: month_str, total_cents: total });
    }

    Ok(results)
}

#[tauri::command]
pub async fn get_spending_by_date_range(
    state: State<'_, AppState>,
    date_from: String,
    date_to: String,
) -> Result<Vec<SpendingRow>, String> {
    sqlx::query_as::<_, (i64, String, String, i64)>(
        "SELECT c.id, c.name, c.color,
                COALESCE(ABS(SUM(CASE WHEN t.amount_cents < 0 THEN t.amount_cents ELSE 0 END)), 0)
         FROM categories c
         LEFT JOIN transactions t ON t.category_id = c.id
                                  AND t.date >= ? AND t.date <= ?
         GROUP BY c.id, c.name, c.color
         HAVING COALESCE(ABS(SUM(CASE WHEN t.amount_cents < 0 THEN t.amount_cents ELSE 0 END)), 0) > 0
         ORDER BY 4 DESC",
    )
    .bind(&date_from)
    .bind(&date_to)
    .fetch_all(&state.db)
    .await
    .map(|rows| {
        rows.into_iter()
            .map(|(id, name, color, cents)| SpendingRow {
                category_id: id,
                category_name: name,
                color,
                spent_cents: cents,
            })
            .collect()
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_net_worth_detail(state: State<'_, AppState>) -> Result<Vec<AccountNetWorthRow>, String> {
    let today = Local::now().date_naive();
    // First day of current month as the prev-month cutoff
    let first_of_month = format!("{}-{:02}-01", today.year(), today.month());

    sqlx::query_as::<_, (i64, String, String, String, i64, i64)>(
        "SELECT a.id, a.name, a.type, a.currency,
                a.initial_balance + COALESCE((SELECT SUM(t.amount_cents) FROM transactions t WHERE t.account_id = a.id), 0) AS current_balance,
                a.initial_balance + COALESCE((SELECT SUM(t.amount_cents) FROM transactions t WHERE t.account_id = a.id AND t.date < ?), 0) AS prev_month_balance
         FROM accounts a
         ORDER BY a.name",
    )
    .bind(&first_of_month)
    .fetch_all(&state.db)
    .await
    .map(|rows| {
        rows.into_iter()
            .map(|(id, name, account_type, currency, current_balance, prev_month_balance)| {
                AccountNetWorthRow { id, name, account_type, currency, current_balance, prev_month_balance }
            })
            .collect()
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_month_comparison(
    state: State<'_, AppState>,
    month_a: String,
    month_b: String,
) -> Result<Vec<MonthComparisonRow>, String> {
    sqlx::query_as::<_, (i64, String, String, i64, i64)>(
        "SELECT c.id, c.name, c.color,
                COALESCE(ABS(SUM(CASE WHEN strftime('%Y-%m', t.date) = ? AND t.amount_cents < 0 THEN t.amount_cents ELSE 0 END)), 0) AS month_a_cents,
                COALESCE(ABS(SUM(CASE WHEN strftime('%Y-%m', t.date) = ? AND t.amount_cents < 0 THEN t.amount_cents ELSE 0 END)), 0) AS month_b_cents
         FROM categories c
         LEFT JOIN transactions t ON t.category_id = c.id
                                  AND strftime('%Y-%m', t.date) IN (?, ?)
         GROUP BY c.id, c.name, c.color
         HAVING month_a_cents > 0 OR month_b_cents > 0
         ORDER BY c.name",
    )
    .bind(&month_a)
    .bind(&month_b)
    .bind(&month_a)
    .bind(&month_b)
    .fetch_all(&state.db)
    .await
    .map(|rows| {
        rows.into_iter()
            .map(|(id, name, color, a, b)| MonthComparisonRow {
                category_id: id,
                category_name: name,
                color,
                month_a_cents: a,
                month_b_cents: b,
            })
            .collect()
    })
    .map_err(|e| e.to_string())
}
