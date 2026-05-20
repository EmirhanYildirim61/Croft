use crate::db::AppState;
use tauri::{Manager, State};

const DB_LOCATION_FILE: &str = "db_location.cfg";

#[tauri::command]
pub async fn get_db_path(state: State<'_, AppState>) -> Result<String, String> {
    Ok(state.db_path.clone())
}

/// Copy the current database to `new_folder`, save the new path to the
/// db_location.cfg override file, and return the new path.
/// The change takes effect on the next app launch (no live pool switch).
#[tauri::command]
pub async fn move_db(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    new_folder: String,
) -> Result<String, String> {
    let src = std::path::Path::new(&state.db_path);
    let file_name = src
        .file_name()
        .ok_or_else(|| "Cannot determine database filename.".to_string())?;

    let dest_dir = std::path::Path::new(&new_folder);
    if !dest_dir.exists() {
        return Err(format!("Destination folder does not exist: {new_folder}"));
    }

    let dest = dest_dir.join(file_name);
    if dest == src {
        return Err("Destination is the same as the current location.".to_string());
    }

    // Checkpoint the WAL so the copy is a complete, consistent snapshot.
    sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    std::fs::copy(src, &dest).map_err(|e| format!("Failed to copy database: {e}"))?;

    // Persist the new path so it is used on next launch.
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let cfg_file = app_data_dir.join(DB_LOCATION_FILE);
    let new_path = dest.to_string_lossy().to_string();
    std::fs::write(&cfg_file, &new_path)
        .map_err(|e| format!("Failed to save new database location: {e}"))?;

    Ok(new_path)
}
