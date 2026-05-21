use crate::db::AppState;
use crate::models::{CsvPreviewRow, ImportRow};
use tauri::State;
use std::fs;

fn find_col(headers: &csv::StringRecord, candidates: &[&str]) -> Option<usize> {
    headers.iter().position(|h| {
        candidates
            .iter()
            .any(|c| h.trim().to_lowercase() == c.to_lowercase())
    })
}

fn parse_amount_cents(s: &str) -> i64 {
    // Strip everything except digits, dot, and leading minus
    let cleaned: String = s
        .chars()
        .filter(|c| c.is_ascii_digit() || *c == '.' || *c == '-')
        .collect();
    let f: f64 = cleaned.parse().unwrap_or(0.0);
    (f * 100.0).round() as i64
}

#[tauri::command]
pub async fn import_csv(path: String) -> Result<Vec<CsvPreviewRow>, String> {
    let mut rdr = csv::Reader::from_path(&path).map_err(|e| e.to_string())?;
    let headers = rdr.headers().map_err(|e| e.to_string())?.clone();

    let date_col = find_col(
        &headers,
        &["date", "transaction date", "trans date", "posted date", "value date"],
    );
    let payee_col = find_col(
        &headers,
        &["payee", "description", "merchant", "memo", "name", "narrative"],
    );
    // If both Debit and Credit columns exist (common bank export format),
    // we'll combine them. Otherwise fall back to a single "amount" column.
    let debit_col  = find_col(&headers, &["debit", "withdrawal", "outflow"]);
    let credit_col = find_col(&headers, &["credit", "deposit", "inflow"]);
    let amount_col = find_col(
        &headers,
        &["amount", "transaction amount", "value"],
    );

    let mut rows = Vec::new();
    for (i, result) in rdr.records().enumerate() {
        let record = result.map_err(|e| e.to_string())?;
        let date = date_col
            .and_then(|c| record.get(c))
            .unwrap_or("")
            .trim()
            .to_string();
        let payee = payee_col
            .and_then(|c| record.get(c))
            .unwrap_or("")
            .trim()
            .to_string();
        let amount_cents = if debit_col.is_some() || credit_col.is_some() {
            let debit  = debit_col.and_then(|c| record.get(c)).map(parse_amount_cents).unwrap_or(0).abs();
            let credit = credit_col.and_then(|c| record.get(c)).map(parse_amount_cents).unwrap_or(0).abs();
            credit - debit
        } else {
            amount_col.and_then(|c| record.get(c)).map(parse_amount_cents).unwrap_or(0)
        };

        rows.push(CsvPreviewRow {
            row_index: i,
            date,
            payee,
            amount_cents,
            suggested_category_id: None,
            note: String::new(),
        });
    }
    Ok(rows)
}

#[tauri::command]
pub async fn confirm_csv_import(
    state: State<'_, AppState>,
    rows: Vec<ImportRow>,
) -> Result<usize, String> {
    let count = rows.len();
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;
    for row in &rows {
        sqlx::query(
            "INSERT INTO transactions
                 (account_id, date, amount_cents, payee, category_id, note)
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(row.account_id)
        .bind(&row.date)
        .bind(row.amount_cents)
        .bind(&row.payee)
        .bind(row.category_id)
        .bind(&row.note)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(count)
}

fn parse_ynab_date(s: &str) -> String {
    // YNAB exports MM/DD/YYYY; normalize to YYYY-MM-DD
    let s = s.trim();
    if s.contains('/') {
        let parts: Vec<&str> = s.splitn(3, '/').collect();
        if parts.len() == 3 {
            let m: u32 = parts[0].parse().unwrap_or(0);
            let d: u32 = parts[1].parse().unwrap_or(0);
            let y: u32 = parts[2].parse().unwrap_or(0);
            return format!("{:04}-{:02}-{:02}", y, m, d);
        }
    }
    s.to_string()
}

#[tauri::command]
pub async fn import_ynab_csv(path: String) -> Result<Vec<CsvPreviewRow>, String> {
    let mut rdr = csv::Reader::from_path(&path).map_err(|e| e.to_string())?;
    let headers = rdr.headers().map_err(|e| e.to_string())?.clone();

    let date_col    = find_col(&headers, &["date"]);
    let payee_col   = find_col(&headers, &["payee", "payee name"]);
    let memo_col    = find_col(&headers, &["memo"]);
    let outflow_col = find_col(&headers, &["outflow"]);
    let inflow_col  = find_col(&headers, &["inflow"]);

    let mut rows = Vec::new();
    for (i, result) in rdr.records().enumerate() {
        let record = result.map_err(|e| e.to_string())?;

        let raw_date = date_col.and_then(|c| record.get(c)).unwrap_or("").trim().to_string();
        let date = parse_ynab_date(&raw_date);
        let payee = payee_col.and_then(|c| record.get(c)).unwrap_or("").trim().to_string();
        let note  = memo_col.and_then(|c| record.get(c)).unwrap_or("").trim().to_string();

        let outflow = outflow_col.and_then(|c| record.get(c)).map(parse_amount_cents).unwrap_or(0);
        let inflow  = inflow_col.and_then(|c| record.get(c)).map(parse_amount_cents).unwrap_or(0);
        // YNAB convention: outflow is positive for expenses → negate; inflow positive for income
        let amount_cents = inflow - outflow;

        rows.push(CsvPreviewRow { row_index: i, date, payee, amount_cents, suggested_category_id: None, note });
    }
    Ok(rows)
}

fn parse_qif_date(s: &str) -> String {
    let s = s.trim();
    // Formats: M/D/Y, MM/DD/YY, MM/DD/YYYY, M-D-Y (GnuCash uses / or -)
    let sep = if s.contains('/') { '/' } else { '-' };
    let parts: Vec<&str> = s.splitn(3, sep).collect();
    if parts.len() == 3 {
        let m: u32 = parts[0].parse().unwrap_or(0);
        let d: u32 = parts[1].parse().unwrap_or(0);
        let y_raw: u32 = parts[2].parse().unwrap_or(0);
        let y = if y_raw < 100 { 2000 + y_raw } else { y_raw };
        return format!("{:04}-{:02}-{:02}", y, m, d);
    }
    s.to_string()
}

#[tauri::command]
pub async fn import_qif(path: String) -> Result<Vec<CsvPreviewRow>, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;

    let mut rows = Vec::new();
    let mut row_index: usize = 0;
    let mut date = String::new();
    let mut amount_cents: i64 = 0;
    let mut payee = String::new();
    let mut note = String::new();

    for line in content.lines() {
        if line.is_empty() || line.starts_with('!') {
            continue;
        }
        let (tag, value) = line.split_at(1);
        let value = value.trim();
        match tag {
            "D" => date = parse_qif_date(value),
            "T" | "U" => amount_cents = parse_amount_cents(value),
            "P" => payee = value.to_string(),
            "M" | "N" => note = value.to_string(),
            "^" => {
                if !date.is_empty() {
                    rows.push(CsvPreviewRow {
                        row_index,
                        date: date.clone(),
                        payee: payee.clone(),
                        amount_cents,
                        suggested_category_id: None,
                        note: note.clone(),
                    });
                    row_index += 1;
                }
                date.clear(); payee.clear(); note.clear(); amount_cents = 0;
            }
            _ => {}
        }
    }
    // Flush last record if no trailing ^
    if !date.is_empty() {
        rows.push(CsvPreviewRow { row_index, date, payee, amount_cents, suggested_category_id: None, note });
    }
    Ok(rows)
}

#[cfg(test)]
mod tests {
    use super::{find_col, parse_amount_cents};

    // ── parse_amount_cents ────────────────────────────────────────────────────

    #[test]
    fn parse_plain_integer() {
        assert_eq!(parse_amount_cents("42"), 4200);
    }

    #[test]
    fn parse_decimal_rounds() {
        assert_eq!(parse_amount_cents("19.99"), 1999);
    }

    #[test]
    fn parse_negative() {
        assert_eq!(parse_amount_cents("-50.00"), -5000);
    }

    #[test]
    fn parse_with_currency_symbol() {
        // dollar sign and comma are stripped; only digits, dot, minus survive
        assert_eq!(parse_amount_cents("$1,234.56"), 123456);
    }

    #[test]
    fn parse_empty_is_zero() {
        assert_eq!(parse_amount_cents(""), 0);
    }

    #[test]
    fn parse_non_numeric_is_zero() {
        assert_eq!(parse_amount_cents("N/A"), 0);
    }

    // ── find_col ─────────────────────────────────────────────────────────────

    fn make_headers(cols: &[&str]) -> csv::StringRecord {
        csv::StringRecord::from(cols.to_vec())
    }

    #[test]
    fn find_col_exact_match() {
        let h = make_headers(&["date", "amount", "payee"]);
        assert_eq!(find_col(&h, &["date"]), Some(0));
        assert_eq!(find_col(&h, &["amount"]), Some(1));
    }

    #[test]
    fn find_col_alias_match() {
        let h = make_headers(&["Transaction Date", "Description", "Debit"]);
        // "transaction date" alias should hit column 0
        assert_eq!(
            find_col(&h, &["date", "transaction date", "trans date"]),
            Some(0)
        );
    }

    #[test]
    fn find_col_case_insensitive() {
        let h = make_headers(&["PAYEE"]);
        assert_eq!(find_col(&h, &["payee"]), Some(0));
    }

    #[test]
    fn find_col_missing_returns_none() {
        let h = make_headers(&["date", "amount"]);
        assert_eq!(find_col(&h, &["payee", "description"]), None);
    }

    #[test]
    fn find_col_whitespace_trimmed() {
        let h = make_headers(&["  amount  "]);
        assert_eq!(find_col(&h, &["amount"]), Some(0));
    }
}
