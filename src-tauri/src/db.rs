use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::fs;
use std::path::Path;

pub struct AppState {
    pub db: SqlitePool,
    pub db_path: String,
}

pub async fn init_db(db_path: &str) -> Result<SqlitePool, sqlx::Error> {
    if let Some(parent) = Path::new(db_path).parent() {
        fs::create_dir_all(parent).ok();
    }

    let options = SqliteConnectOptions::new()
        .filename(db_path)
        .create_if_missing(true)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal);

    let pool = SqlitePoolOptions::new()
        .connect_with(options)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;
    Ok(pool)
}
