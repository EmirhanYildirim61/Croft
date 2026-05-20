use crate::db::AppState;
use crate::models::RecurringItem;
use chrono::{Local, Months, NaiveDate};
use tauri::State;

fn advance_date(date_str: &str, frequency: &str) -> Result<String, String> {
    let d = NaiveDate::parse_from_str(date_str, "%Y-%m-%d").map_err(|e| e.to_string())?;
    let next = match frequency {
        "daily" => d + chrono::Duration::days(1),
        "weekly" => d + chrono::Duration::weeks(1),
        "monthly" => d
            .checked_add_months(Months::new(1))
            .ok_or_else(|| "date overflow".to_string())?,
        "yearly" => d
            .checked_add_months(Months::new(12))
            .ok_or_else(|| "date overflow".to_string())?,
        other => return Err(format!("unknown frequency: {other}")),
    };
    Ok(next.format("%Y-%m-%d").to_string())
}

#[tauri::command]
pub async fn add_recurring_item(
    state: State<'_, AppState>,
    label: String,
    account_id: i64,
    category_id: Option<i64>,
    amount_cents: i64,
    frequency: String,
    next_due_date: String,
) -> Result<i64, String> {
    let result = sqlx::query(
        "INSERT INTO recurring_items
             (label, account_id, category_id, amount_cents, frequency, next_due_date)
         VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&label)
    .bind(account_id)
    .bind(category_id)
    .bind(amount_cents)
    .bind(&frequency)
    .bind(&next_due_date)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(result.last_insert_rowid())
}

#[tauri::command]
pub async fn list_recurring_items(
    state: State<'_, AppState>,
) -> Result<Vec<RecurringItem>, String> {
    sqlx::query_as::<_, RecurringItem>(
        "SELECT * FROM recurring_items ORDER BY next_due_date",
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn generate_due_recurring_transactions(
    state: State<'_, AppState>,
) -> Result<usize, String> {
    let today = Local::now().date_naive().format("%Y-%m-%d").to_string();

    let due: Vec<RecurringItem> = sqlx::query_as::<_, RecurringItem>(
        "SELECT * FROM recurring_items WHERE next_due_date <= ?",
    )
    .bind(&today)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let mut count = 0usize;
    for item in &due {
        let mut current_due = item.next_due_date.clone();
        // Loop to catch up multiple overdue periods (e.g. app not opened for months)
        loop {
            sqlx::query(
                "INSERT INTO transactions
                     (account_id, date, amount_cents, payee, category_id, note, is_recurring)
                 VALUES (?, ?, ?, ?, ?, '', 1)",
            )
            .bind(item.account_id)
            .bind(&current_due)
            .bind(item.amount_cents)
            .bind(&item.label)
            .bind(item.category_id)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;

            count += 1;
            let next = advance_date(&current_due, &item.frequency)?;
            sqlx::query("UPDATE recurring_items SET next_due_date = ? WHERE id = ?")
                .bind(&next)
                .bind(item.id)
                .execute(&state.db)
                .await
                .map_err(|e| e.to_string())?;

            if next > today {
                break;
            }
            current_due = next;
        }
    }
    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::advance_date;

    #[test]
    fn advance_daily() {
        assert_eq!(advance_date("2024-01-31", "daily").unwrap(), "2024-02-01");
    }

    #[test]
    fn advance_weekly() {
        assert_eq!(advance_date("2024-03-01", "weekly").unwrap(), "2024-03-08");
    }

    #[test]
    fn advance_monthly_normal() {
        assert_eq!(advance_date("2024-01-15", "monthly").unwrap(), "2024-02-15");
    }

    #[test]
    fn advance_monthly_year_boundary() {
        assert_eq!(advance_date("2023-12-01", "monthly").unwrap(), "2024-01-01");
    }

    #[test]
    fn advance_yearly() {
        assert_eq!(advance_date("2023-06-15", "yearly").unwrap(), "2024-06-15");
    }

    #[test]
    fn advance_unknown_frequency_errors() {
        assert!(advance_date("2024-01-01", "fortnightly").is_err());
    }

    #[test]
    fn advance_invalid_date_errors() {
        assert!(advance_date("not-a-date", "daily").is_err());
    }
}
