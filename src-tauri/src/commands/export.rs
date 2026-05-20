use crate::db::AppState;
use crate::models::{Account, Budget, Category, ExportData, RecurringItem, Transaction};
use serde::Serialize;
use tauri::State;

#[derive(Debug, Serialize, sqlx::FromRow)]
struct TransactionExportRow {
    id: i64,
    date: String,
    amount_cents: i64,
    payee: String,
    account_name: String,
    category_name: Option<String>,
    note: String,
}

#[tauri::command]
pub async fn export_to_csv(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let rows: Vec<TransactionExportRow> = sqlx::query_as::<_, TransactionExportRow>(
        "SELECT t.id, t.date, t.amount_cents, t.payee,
                a.name AS account_name, c.name AS category_name, t.note
         FROM transactions t
         JOIN accounts a ON a.id = t.account_id
         LEFT JOIN categories c ON c.id = t.category_id
         ORDER BY t.date, t.id",
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let mut wtr = csv::Writer::from_path(&path).map_err(|e| e.to_string())?;
    for row in &rows {
        wtr.serialize(row).map_err(|e| e.to_string())?;
    }
    wtr.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn export_to_json(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let accounts = sqlx::query_as::<_, Account>("SELECT * FROM accounts ORDER BY name")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let categories = sqlx::query_as::<_, Category>("SELECT * FROM categories ORDER BY name")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let transactions =
        sqlx::query_as::<_, Transaction>("SELECT * FROM transactions ORDER BY date, id")
            .fetch_all(&state.db)
            .await
            .map_err(|e| e.to_string())?;

    let budgets =
        sqlx::query_as::<_, Budget>("SELECT * FROM budgets ORDER BY month, category_id")
            .fetch_all(&state.db)
            .await
            .map_err(|e| e.to_string())?;

    let recurring_items =
        sqlx::query_as::<_, RecurringItem>("SELECT * FROM recurring_items ORDER BY id")
            .fetch_all(&state.db)
            .await
            .map_err(|e| e.to_string())?;

    let data = ExportData { accounts, categories, transactions, budgets, recurring_items };
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}
