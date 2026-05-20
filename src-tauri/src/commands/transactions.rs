use crate::db::AppState;
use crate::models::Transaction;
use sqlx::QueryBuilder;
use tauri::State;

#[tauri::command]
pub async fn add_transaction(
    state: State<'_, AppState>,
    account_id: i64,
    date: String,
    amount_cents: i64,
    payee: String,
    category_id: Option<i64>,
    note: String,
) -> Result<i64, String> {
    let result = sqlx::query(
        "INSERT INTO transactions (account_id, date, amount_cents, payee, category_id, note)
         VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(account_id)
    .bind(&date)
    .bind(amount_cents)
    .bind(&payee)
    .bind(category_id)
    .bind(&note)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(result.last_insert_rowid())
}

#[tauri::command]
pub async fn list_transactions(
    state: State<'_, AppState>,
    account_id: Option<i64>,
    month: Option<String>,
    category_id: Option<i64>,
) -> Result<Vec<Transaction>, String> {
    let mut qb: QueryBuilder<sqlx::Sqlite> =
        QueryBuilder::new("SELECT * FROM transactions WHERE 1=1");

    if let Some(aid) = account_id {
        qb.push(" AND account_id = ");
        qb.push_bind(aid);
    }
    if let Some(ref m) = month {
        qb.push(" AND strftime('%Y-%m', date) = ");
        qb.push_bind(m.clone());
    }
    if let Some(cid) = category_id {
        qb.push(" AND category_id = ");
        qb.push_bind(cid);
    }
    qb.push(" ORDER BY date DESC, id DESC");

    qb.build_query_as::<Transaction>()
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_transaction(
    state: State<'_, AppState>,
    id: i64,
    date: String,
    amount_cents: i64,
    payee: String,
    category_id: Option<i64>,
    note: String,
) -> Result<(), String> {
    sqlx::query(
        "UPDATE transactions
         SET date = ?, amount_cents = ?, payee = ?, category_id = ?, note = ?
         WHERE id = ?",
    )
    .bind(&date)
    .bind(amount_cents)
    .bind(&payee)
    .bind(category_id)
    .bind(&note)
    .bind(id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_transaction(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    sqlx::query("DELETE FROM transactions WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
