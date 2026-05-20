use crate::db::AppState;
use crate::models::NetWorthPoint;
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
