use std::fs::{self, OpenOptions};
use std::io::{self, Read, Write};
use std::path::PathBuf;

use anyhow::{Context, Result};
use chrono::Local;

mod types;
mod manage_db;

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
    log_line("native-host started");
    log_line("waiting native message length header");
    let input = read_native_message().context("read_input failed")?;
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
            manage_db::match_messages::upsert_messages(&db_pool, &partner, &messages).await?;
            log_line(&format!(
                "received MATCH_MESSAGES: partner_id={}, messages={}",
                partner.id,
                messages.len()
            ));
            serde_json::json!({ "ok": true })
        }
        types::RequestFromChrome::MatchProfile {
            partner,
            partner_profile,
        } => {
            manage_db::match_profile::upsert_partner_profile(&db_pool, &partner, partner_profile.as_ref())
                .await?;
            log_line(&format!(
                "received MATCH_PROFILE: partner_id={}, has_profile={}",
                partner.id,
                partner_profile.is_some()
            ));
            serde_json::json!({ "ok": true })
        }
        types::RequestFromChrome::MyProfile { 
            my_profile
        } => {
            manage_db::my_profile::upsert_my_profile(&db_pool, my_profile.as_ref()).await?;
            log_line(&format!(
                "received MY_PROFILE: has_profile={}",
                my_profile.is_some()
            ));
            serde_json::json!({ "ok": true })
        }
    };

    let output_bytes = serde_json::to_vec(&output).context("failed to serialize response JSON")?;
    write_native_message(&output_bytes).context("failed to write native response")?;
    log_line("response sent");
    Ok(())
}

fn read_native_message() -> Result<Vec<u8>> {
    let mut stdin = io::stdin();

    // Chrome Native Messaging: 先頭4byte little-endianでJSONサイズが入る。
    let mut len_buf = [0_u8; 4];
    stdin
        .read_exact(&mut len_buf)
        .context("failed to read native message length header")?;
    let len = u32::from_le_bytes(len_buf) as usize;

    let mut payload = vec![0_u8; len];
    stdin
        .read_exact(&mut payload)
        .context("failed to read native message payload")?;

    Ok(payload)
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
