use crate::db::AppState;
use crate::models::AccountWithBalance;
use tauri::State;

#[tauri::command]
pub async fn create_account(
    state: State<'_, AppState>,
    name: String,
    account_type: String,
    currency: String,
    initial_balance: i64,
) -> Result<i64, String> {
    let result = sqlx::query(
        "INSERT INTO accounts (name, type, currency, initial_balance) VALUES (?, ?, ?, ?)",
    )
    .bind(&name)
    .bind(&account_type)
    .bind(&currency)
    .bind(initial_balance)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(result.last_insert_rowid())
}

#[tauri::command]
pub async fn list_accounts(
    state: State<'_, AppState>,
) -> Result<Vec<AccountWithBalance>, String> {
    sqlx::query_as::<_, AccountWithBalance>(
        "SELECT a.id, a.name, a.type, a.currency, a.initial_balance, a.created_at,
                a.initial_balance + COALESCE(SUM(t.amount_cents), 0) AS current_balance
         FROM accounts a
         LEFT JOIN transactions t ON t.account_id = a.id
         GROUP BY a.id
         ORDER BY a.name",
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_account(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    sqlx::query("DELETE FROM accounts WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
