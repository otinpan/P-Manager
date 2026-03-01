use std::fs;
use std::path::PathBuf;
use std::str::FromStr;

use anyhow::{Context, Result};
use sqlx::sqlite::SqliteConnectOptions;
use sqlx::SqlitePool;

pub mod match_messages;
pub mod match_profile;
pub mod my_profile;

pub async fn connect_pool() -> Result<SqlitePool> {
    let db_path = db_file_path()?;
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent).context("failed to create db directory")?;
    }

    let db_url = format!("sqlite://{}", db_path.to_string_lossy());
    let options = SqliteConnectOptions::from_str(&db_url)
        .context("failed to parse sqlite url")?
        .create_if_missing(true);

    let pool = SqlitePool::connect_with(options)
        .await
        .context("failed to connect sqlite")?;
    init_schema(&pool).await?;
    Ok(pool)
}

async fn init_schema(pool: &SqlitePool) -> Result<()> {
    match_messages::ensure_tables(pool).await?;
    match_profile::ensure_table(pool).await?;
    my_profile::ensure_table(pool).await?;
    Ok(())
}

fn db_file_path() -> Result<PathBuf> {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        return Ok(PathBuf::from(local_app_data)
            .join("PManager")
            .join("native-host.db"));
    }
    Ok(std::env::temp_dir().join("native-host.db"))
}
