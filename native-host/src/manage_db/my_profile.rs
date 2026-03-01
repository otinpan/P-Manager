use anyhow::Result;
use sqlx::SqlitePool;

use crate::types::MyProfileRow;

pub async fn ensure_table(pool: &SqlitePool) -> Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS my_profiles (
            id TEXT PRIMARY KEY,
            updated_at TEXT NOT NULL,
            profile_json TEXT NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn upsert_my_profile(pool: &SqlitePool, my_profile: Option<&MyProfileRow>) -> Result<()> {
    let Some(profile) = my_profile else {
        return Ok(());
    };

    let profile_json = serde_json::to_string(profile)?;
    sqlx::query(
        r#"
        INSERT INTO my_profiles (id, updated_at, profile_json)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            updated_at = excluded.updated_at,
            profile_json = excluded.profile_json
        "#,
    )
    .bind(&profile.id)
    .bind(&profile.updated_at)
    .bind(profile_json)
    .execute(pool)
    .await?;

    Ok(())
}
