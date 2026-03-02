use anyhow::Result;
use sqlx::SqlitePool;

use crate::types::{PartnerProfileRow, PartnerRow};

pub async fn ensure_table(pool: &SqlitePool) -> Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS partner_profiles (
            partner_id TEXT PRIMARY KEY,
            profile_json TEXT NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn upsert_partner_profile(
    pool: &SqlitePool,
    partner: &PartnerRow,
    partner_profile: Option<&PartnerProfileRow>,
) -> Result<()> {
    let Some(profile) = partner_profile else {
        return Ok(());
    };

    let profile_json = serde_json::to_string(profile)?;
    sqlx::query(
        r#"
        INSERT INTO partner_profiles (partner_id, profile_json)
        VALUES (?, ?)
        ON CONFLICT(partner_id) DO UPDATE SET
            profile_json = excluded.profile_json
        "#,
    )
    .bind(&partner.id)
    .bind(profile_json)
    .execute(pool)
    .await?;

    Ok(())
}


