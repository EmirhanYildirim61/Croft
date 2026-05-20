mod commands;
mod db;
mod models;

use db::{init_db, AppState};
use tauri::Manager;

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
            let db_path = app_data_dir.join("finance.db").to_string_lossy().to_string();

            let pool = tauri::async_runtime::block_on(init_db(&db_path))
                .expect("failed to initialise database");

            app.manage(AppState { db: pool });
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
            commands::budgets::set_budget,
            commands::budgets::get_budget_summary,
            commands::recurring::add_recurring_item,
            commands::recurring::list_recurring_items,
            commands::recurring::generate_due_recurring_transactions,
            commands::reports::get_net_worth_history,
            commands::export::export_to_csv,
            commands::export::export_to_json,
            commands::import::import_csv,
            commands::import::confirm_csv_import,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
