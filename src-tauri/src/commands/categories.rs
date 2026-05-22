use crate::db::AppState;
use crate::models::Category;
use tauri::State;

#[tauri::command]
pub async fn list_categories(state: State<'_, AppState>) -> Result<Vec<Category>, String> {
    sqlx::query_as::<_, Category>("SELECT * FROM categories ORDER BY name")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_category(
    state: State<'_, AppState>,
    name: String,
    parent_id: Option<i64>,
    color: String,
) -> Result<i64, String> {
    let result =
        sqlx::query("INSERT INTO categories (name, parent_id, color) VALUES (?, ?, ?)")
            .bind(&name)
            .bind(parent_id)
            .bind(&color)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;
    Ok(result.last_insert_rowid())
}

#[tauri::command]
pub async fn update_category(
    state: State<'_, AppState>,
    id: i64,
    name: String,
    parent_id: Option<i64>,
    color: String,
) -> Result<(), String> {
    if parent_id == Some(id) {
        return Err("A category cannot be its own parent.".to_string());
    }
    sqlx::query("UPDATE categories SET name = ?, parent_id = ?, color = ? WHERE id = ?")
        .bind(&name)
        .bind(parent_id)
        .bind(&color)
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_category(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    sqlx::query("DELETE FROM categories WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Renames the 11 seeded default categories (IDs 1–11) to localized names.
/// Called once during first-launch onboarding after the user picks a language.
#[tauri::command]
pub async fn rename_default_categories(
    state: State<'_, AppState>,
    names: Vec<String>,
) -> Result<(), String> {
    const DEFAULT_IDS: [i64; 11] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    if names.len() != DEFAULT_IDS.len() {
        return Err(format!(
            "Expected {} names, got {}",
            DEFAULT_IDS.len(),
            names.len()
        ));
    }
    for (id, name) in DEFAULT_IDS.iter().zip(names.iter()) {
        sqlx::query("UPDATE categories SET name = ? WHERE id = ?")
            .bind(name)
            .bind(id)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
