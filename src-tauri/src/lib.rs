use sqlx::SqlitePool;
use std::fs;
use tauri::{Manager, State};

pub struct AppState {
    pub db: SqlitePool,
}

async fn init_db(db_path: &str) -> Result<SqlitePool, sqlx::Error> {
    // Ensure the parent directory exists
    if let Some(parent) = std::path::Path::new(db_path).parent() {
        fs::create_dir_all(parent).ok();
    }

    let connect_str = format!("sqlite://{}?mode=rwc", db_path);
    let pool = SqlitePool::connect(&connect_str).await?;
    sqlx::migrate!("./migrations").run(&pool).await?;
    Ok(pool)
}

#[tauri::command]
fn get_db_path(state: State<'_, AppState>) -> String {
    // Returns empty — real path exposed later via settings
    drop(state);
    String::new()
}

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
            let db_path = app_data_dir
                .join("finance.db")
                .to_string_lossy()
                .to_string();

            let pool = tauri::async_runtime::block_on(init_db(&db_path))
                .expect("failed to initialise database");

            app.manage(AppState { db: pool });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_db_path])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
