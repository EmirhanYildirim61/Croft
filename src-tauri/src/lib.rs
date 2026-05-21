mod commands;
mod db;
mod financial;
mod models;

use db::{init_db, AppState};
use tauri::Manager;

/// Name of the file saved in app_data_dir that overrides the default DB location.
const DB_LOCATION_FILE: &str = "db_location.cfg";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");

            // Allow users to relocate the DB by writing its new path to db_location.cfg.
            let cfg_file = app_data_dir.join(DB_LOCATION_FILE);
            let db_path = if cfg_file.exists() {
                std::fs::read_to_string(&cfg_file)
                    .map(|s| s.trim().to_string())
                    .unwrap_or_default()
            } else {
                String::new()
            };

            let db_path = if db_path.is_empty() {
                app_data_dir.join("finance.db").to_string_lossy().to_string()
            } else {
                db_path
            };

            let pool = tauri::async_runtime::block_on(init_db(&db_path))
                .expect("failed to initialise database");

            app.manage(AppState { db: pool, db_path });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::accounts::create_account,
            commands::accounts::list_accounts,
            commands::accounts::delete_account,
            commands::transactions::add_transaction,
            commands::transactions::list_transactions,
            commands::transactions::update_transaction,
            commands::transactions::delete_transaction,
            commands::categories::list_categories,
            commands::categories::add_category,
            commands::categories::update_category,
            commands::categories::delete_category,
            commands::budgets::set_budget,
            commands::budgets::get_budget_summary,
            commands::recurring::add_recurring_item,
            commands::recurring::list_recurring_items,
            commands::recurring::update_recurring_item,
            commands::recurring::delete_recurring_item,
            commands::recurring::generate_due_recurring_transactions,
            commands::reports::get_net_worth_history,
            commands::export::export_to_csv,
            commands::export::export_to_json,
            commands::import::import_csv,
            commands::import::confirm_csv_import,
            commands::import::import_ynab_csv,
            commands::import::import_qif,
            commands::recurring::mark_recurring_paid,
            commands::recurring::skip_recurring,
            commands::reports::get_spending_by_date_range,
            commands::reports::get_net_worth_detail,
            commands::reports::get_month_comparison,
            commands::settings::get_db_path,
            commands::settings::move_db,
            commands::currency::set_exchange_rate,
            commands::currency::list_exchange_rates,
            commands::currency::delete_exchange_rate,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
