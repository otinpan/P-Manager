use anyhow::Result;
use sqlx::SqlitePool;

use crate::types::{MessageRow, PartnerRow};

pub async fn ensure_tables(pool: &SqlitePool) -> Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS partners (
            id TEXT PRIMARY KEY,
            updated_at TEXT NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            partner_id TEXT NOT NULL,
            sent_at TEXT NOT NULL,
            is_mine INTEGER NOT NULL,
            body TEXT NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn upsert_messages(
    pool: &SqlitePool,
    partner: &PartnerRow,
    messages: &[MessageRow],
) -> Result<()> {
    let mut tx = pool.begin().await?;

    sqlx::query(
        r#"
        INSERT INTO partners (id, updated_at)
        VALUES (?, ?)
        ON CONFLICT(id) DO UPDATE SET
            updated_at = excluded.updated_at
        "#,
    )
    .bind(&partner.id)
    .bind(&partner.updated_at)
    .execute(&mut *tx)
    .await?;

    for message in messages {
        sqlx::query(
            r#"
            INSERT INTO messages (id, partner_id, sent_at, is_mine, body)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                partner_id = excluded.partner_id,
                sent_at = excluded.sent_at,
                is_mine = excluded.is_mine,
                body = excluded.body
            "#,
        )
        .bind(&message.id)
        .bind(&message.partner_id)
        .bind(&message.sent_at)
        .bind(if message.is_mine { 1_i64 } else { 0_i64 })
        .bind(&message.body)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(())
}
