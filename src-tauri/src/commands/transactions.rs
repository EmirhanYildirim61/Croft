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
    category_ids: Option<Vec<i64>>,
    search: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
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
    if let Some(ref df) = date_from {
        qb.push(" AND date >= ");
        qb.push_bind(df.clone());
    }
    if let Some(ref dt) = date_to {
        qb.push(" AND date <= ");
        qb.push_bind(dt.clone());
    }
    // category_ids (multi-select) takes priority over single category_id
    if let Some(ref ids) = category_ids {
        if !ids.is_empty() {
            qb.push(" AND category_id IN (");
            let mut sep = qb.separated(", ");
            for id in ids {
                sep.push_bind(*id);
            }
            qb.push(")");
        }
    } else if let Some(cid) = category_id {
        qb.push(" AND category_id = ");
        qb.push_bind(cid);
    }
    if let Some(ref q) = search {
        let pattern = format!("%{}%", q);
        qb.push(" AND (payee LIKE ");
        qb.push_bind(pattern.clone());
        qb.push(" OR note LIKE ");
        qb.push_bind(pattern);
        qb.push(")");
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
