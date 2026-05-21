use crate::db::AppState;
use crate::models::ExchangeRate;
use tauri::State;

#[tauri::command]
pub async fn set_exchange_rate(
    state: State<'_, AppState>,
    from_currency: String,
    to_currency: String,
    rate: f64,
) -> Result<(), String> {
    if rate <= 0.0 {
        return Err("Exchange rate must be positive.".to_string());
    }
    sqlx::query(
        "INSERT INTO exchange_rates (from_currency, to_currency, rate)
         VALUES (?, ?, ?)
         ON CONFLICT(from_currency, to_currency)
         DO UPDATE SET rate = excluded.rate,
                       updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')",
    )
    .bind(&from_currency)
    .bind(&to_currency)
    .bind(rate)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn list_exchange_rates(
    state: State<'_, AppState>,
) -> Result<Vec<ExchangeRate>, String> {
    sqlx::query_as::<_, ExchangeRate>(
        "SELECT * FROM exchange_rates ORDER BY from_currency, to_currency",
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_exchange_rate(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    sqlx::query("DELETE FROM exchange_rates WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
