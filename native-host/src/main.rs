use std::fs::{self, OpenOptions};
use std::io::{self, Read, Write};
use std::path::PathBuf;

use anyhow::{Context, Result};
use chrono::Local;
use sqlx::SqlitePool;

use crate::gpt_response::{OutputMatchStrategy, OutputMessage, OutputMyProfile};
use crate::types::{MessageRow, MyProfileRow, PartnerProfileRow, PartnerRow};

mod types;
mod manage_db;
mod gpt_response;

fn main() {
    if let Err(err) = run() {
        log_line(&format!("fatal error: {err:#}"));
        eprintln!("fatal error: {err:#}");
        std::process::exit(1);
    }
}

fn run() -> Result<()> {
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async_main())
}

async fn async_main() -> Result<()> {
    // db作成
    let db_pool = manage_db::connect_pool().await?;
    let api_key = load_api_key_from_file()?;
    log_line("native-host started");
    loop {
        log_line("waiting native message length header");
        let Some(input) = read_native_message().context("read_input failed")? else {
            log_line("stdin closed; native-host exiting");
            break;
        };
        log_line(&format!("received {} bytes", input.len()));
        eprintln!("{}", String::from_utf8_lossy(&input));

        let req: types::RequestFromChrome =
            serde_json::from_slice(&input).context("failed to parse Request JSON")?;

        eprintln!("parsed request: {:?}", req);
        log_line(&format!("parsed request: {:?}", req));

        // typeごとに処理
        let output = match req {
            types::RequestFromChrome::MatchMessages { 
                partner,
                messages,
            } => {
            let out = handle_match_messages(&db_pool, &partner, &messages, api_key.as_deref()).await?;
            log_line(&format!(
                "received MATCH_MESSAGES: partner_id={}, messages={}",
                partner.id,
                messages.len()
            ));
            log_line(&format!("MATCH_MESSAGES out: {:?}", out));
            serde_json::json!({ "ok": true, "recommended_message": out.message })
        }
            types::RequestFromChrome::MatchProfile {
                partner,
                partner_profile,
            } => {
                let out = handle_match_profile(&db_pool, &partner, partner_profile.as_ref(), api_key.as_deref()).await?;
            log_line(&format!(
                "received MATCH_PROFILE: partner_id={}, has_profile={}",
                partner.id,
                partner_profile.is_some()
            ));
            log_line(&format!("MATCH_PROFILE out: {:?}", out));
            serde_json::json!({ "ok": true, "recommended_strategy": out.strategy })
        }
            types::RequestFromChrome::MyProfile { 
                my_profile
            } => {
                let out = handle_my_profile(&db_pool, my_profile.as_ref(), api_key.as_deref()).await?;
            log_line(&format!(
                "received MY_PROFILE: has_profile={}",
                my_profile.is_some()
            ));
            log_line(&format!("MY_PROFILE out: {:?}", out));
            serde_json::json!({ "ok": true, "recommended_profile": out.self_introduction })
        }
        };

        let output_bytes = serde_json::to_vec(&output).context("failed to serialize response JSON")?;
        write_native_message(&output_bytes).context("failed to write native response")?;
        log_line("response sent");
    }
    Ok(())
}

// 保存と生成 /////////////////////////////////////////////////////////////////////////////////
// 相手のプロフィール
async fn handle_match_profile(
    pool: &SqlitePool,
    partner: &PartnerRow,
    partner_profile: Option<&PartnerProfileRow>,
    api_key: Option<&str>,
) -> Result<OutputMatchStrategy> {
    // 保存
    manage_db::match_profile::upsert_partner_profile(pool, partner, partner_profile).await?;
    // 生成
    let Some(api_key) = api_key else {
        return Ok(OutputMatchStrategy { strategy: None });
    };
    let Some(my_id) = resolve_my_id(pool).await? else {
        return Ok(OutputMatchStrategy { strategy: None });
    };
    gpt_response::get_recommended_strategy(api_key, pool, &partner.id, &my_id).await
}

async fn handle_match_messages(
    pool: &SqlitePool,
    partner: &PartnerRow,
    messages: &[MessageRow],
    api_key: Option<&str>,
) -> Result<OutputMessage> {
    // 保存
    manage_db::match_messages::upsert_messages(pool, partner, messages).await?;
    // 生成
    let Some(api_key) = api_key else {
        return Ok(OutputMessage { message: None });
    };
    let Some(my_id) = resolve_my_id(pool).await? else {
        return Ok(OutputMessage { message: None });
    };
    gpt_response::get_recommended_message(api_key, pool, &partner.id, &my_id).await
}

async fn handle_my_profile(
    pool: &SqlitePool, 
    my_profile: Option<&MyProfileRow>,
    api_key: Option<&str>,
) -> Result<OutputMyProfile> {
    // 保存
    manage_db::my_profile::upsert_my_profile(pool, my_profile).await?;
    // 生成
    let Some(api_key) = api_key else {
        return Ok(OutputMyProfile {
            self_introduction: None,
        });
    };
    let Some(my_profile) = my_profile else {
        return Ok(OutputMyProfile {
            self_introduction: None,
        });
    };
    gpt_response::get_recommended_profile(api_key, pool, &my_profile.id).await
}

async fn resolve_my_id(pool: &SqlitePool) -> Result<Option<String>> {
    let my_id = sqlx::query_scalar::<_, String>(
        r#"
        SELECT id
        FROM my_profiles
        ORDER BY updated_at DESC
        LIMIT 1
        "#,
    )
    .fetch_optional(pool)
    .await?;

    Ok(my_id)
}

fn read_native_message() -> Result<Option<Vec<u8>>> {
    let mut stdin = io::stdin();

    // Chrome Native Messaging: 先頭4byte little-endianでJSONサイズが入る。
    let mut len_buf = [0_u8; 4];
    if let Err(err) = stdin.read_exact(&mut len_buf) {
        if err.kind() == io::ErrorKind::UnexpectedEof {
            return Ok(None);
        }
        return Err(err).context("failed to read native message length header");
    }
    let len = u32::from_le_bytes(len_buf) as usize;

    let mut payload = vec![0_u8; len];
    stdin
        .read_exact(&mut payload)
        .context("failed to read native message payload")?;

    Ok(Some(payload))
}

fn write_native_message(payload: &[u8]) -> Result<()> {
    let mut stdout = io::stdout().lock();
    let len = (payload.len() as u32).to_le_bytes();
    stdout
        .write_all(&len)
        .context("failed to write response length header")?;
    stdout
        .write_all(payload)
        .context("failed to write response payload")?;
    stdout.flush().context("failed to flush response payload")?;
    Ok(())
}

fn log_line(message: &str) {
    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
    let line = format!("[{timestamp}] {message}\n");

    if let Ok(path) = log_file_path() {
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
            let _ = file.write_all(line.as_bytes());
        }
    }
}

fn log_file_path() -> Result<PathBuf> {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        return Ok(PathBuf::from(local_app_data)
            .join("PManager")
            .join("native-host.log"));
    }
    Ok(std::env::temp_dir().join("native-host.log"))
}

fn load_api_key_from_file() -> Result<Option<String>> {
    let path = std::env::current_dir()?.join("..").join("GPT_API_KEY.txt");
    if !path.exists() {
        return Ok(None);
    }

    let raw = fs::read_to_string(&path)
        .with_context(|| format!("failed to read API key file: {}", path.display()))?;
    let key = raw.trim().to_string();

    if key.is_empty() {
        return Ok(None);
    }
    Ok(Some(key))
}
