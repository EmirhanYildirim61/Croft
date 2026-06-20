use crate::db::AppState;
use crate::models::BudgetSummaryRow;
use tauri::State;

#[tauri::command]
pub async fn set_budget(
    state: State<'_, AppState>,
    category_id: i64,
    month: String,
    amount_cents: i64,
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO budgets (category_id, month, amount_cents) VALUES (?, ?, ?)
         ON CONFLICT(category_id, month) DO UPDATE SET amount_cents = excluded.amount_cents",
    )
    .bind(category_id)
    .bind(&month)
    .bind(amount_cents)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_budget_summary(
    state: State<'_, AppState>,
    month: String,
) -> Result<Vec<BudgetSummaryRow>, String> {
    // spent_cents = absolute sum of all negative (expense) transactions for that category/month.
    // The UNION adds a synthetic row for transactions with no category assigned.
    sqlx::query_as::<_, BudgetSummaryRow>(
        "SELECT c.id AS category_id,
                c.name AS category_name,
                c.color,
                COALESCE(b.amount_cents, 0) AS budgeted_cents,
                COALESCE(ABS(SUM(CASE WHEN t.amount_cents < 0 THEN t.amount_cents ELSE 0 END)), 0)
                    AS spent_cents
         FROM categories c
         LEFT JOIN budgets b ON b.category_id = c.id AND b.month = ?
         LEFT JOIN transactions t
                ON t.category_id = c.id AND strftime('%Y-%m', t.date) = ?
         GROUP BY c.id, c.name, c.color

         UNION ALL

         SELECT -1 AS category_id,
                '__uncategorized__' AS category_name,
                '#94a3b8' AS color,
                0 AS budgeted_cents,
                COALESCE(ABS(SUM(CASE WHEN amount_cents < 0 THEN amount_cents ELSE 0 END)), 0)
                    AS spent_cents
         FROM transactions
         WHERE category_id IS NULL AND strftime('%Y-%m', date) = ?
         HAVING COALESCE(ABS(SUM(CASE WHEN amount_cents < 0 THEN amount_cents ELSE 0 END)), 0) > 0

         ORDER BY category_name",
    )
    .bind(&month)
    .bind(&month)
    .bind(&month)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}
