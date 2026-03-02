use anyhow::{Context, Result, bail};
use schemars::{JsonSchema, schema_for};
use serde::Deserialize;
use serde::de::DeserializeOwned;
use serde_json::{Value, json};
use sqlx::{Row, SqlitePool};

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct OutputMyProfile {
    pub self_introduction: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct OutputMessage {
    pub message: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct OutputMatchStrategy {
    pub strategy: Option<String>,
}

pub async fn get_recommended_profile(
    api_key: &str,
    pool: &SqlitePool,
    my_id: &str,
) -> Result<OutputMyProfile> {
    let my_profile = get_my_profile_json(pool, my_id).await?;
    let user_message = "あなたはマッチングアプリの代行業者です。私の情報から、マッチングアプリのプロフィールを作成してください。";
    let prompt = build_my_profile_prompt(my_profile.as_ref(), user_message);
    send_message_to_llm(api_key, prompt).await
}

pub async fn get_recommended_message(
    api_key: &str,
    pool: &SqlitePool,
    match_id: &str,
    my_id: &str,
    user_prompt: &str,
) -> Result<OutputMessage> {
    let match_profile = get_match_profile_json(pool, match_id).await?;
    let my_profile = get_my_profile_json(pool, my_id).await?;
    let match_messages = get_match_messages_json(pool, match_id).await?;

    let user_message = "あなたはマッチングアプリの代行業者です。プロフィール情報と過去の会話内容、ユーザーの要望から、次に送るメッセージを作成してください。";
    let prompt = build_match_messages_prompt(
        my_profile.as_ref(),
        match_profile.as_ref(),
        match_messages.as_ref(),
        user_prompt,
        user_message,
    );
    send_message_to_llm(api_key, prompt).await
}

pub async fn get_recommended_strategy(
    api_key: &str,
    pool: &SqlitePool,
    match_id: &str,
    my_id: &str,
) -> Result<OutputMatchStrategy> {
    let match_profile = get_match_profile_json(pool, match_id).await?;
    let my_profile = get_my_profile_json(pool, my_id).await?;

    let user_message = "あなたはマッチングアプリの代行業者です。相手のプロフィール情報から、今後どのような戦略でメッセージを送信していけばよさそうですか";

    let prompt = build_match_strategy_prompt(
        my_profile.as_ref(),
        match_profile.as_ref(),
        user_message,
    );

    send_message_to_llm(api_key, prompt).await
}

pub async fn send_message_to_llm<T>(api_key: &str, request_body: Value) -> Result<T>
where
    T: DeserializeOwned,
{
    let client = reqwest::Client::new();

    let resp = client
        .post("https://api.openai.com/v1/chat/completions")
        .bearer_auth(api_key)
        .json(&request_body)
        .send()
        .await
        .context("failed to call OpenAI API")?;

    let status = resp.status();
    let value: Value = resp.json().await.context("failed to parse API response")?;

    if !status.is_success() {
        bail!("OpenAI API returned status {}: {}", status, value);
    }

    let content = value["choices"][0]["message"]["content"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("no content in response"))?;

    let parsed = serde_json::from_str::<T>(&extract_json_content(content)?)?;
    Ok(parsed)
}

pub fn build_my_profile_prompt(my_profile: Option<&Value>, user_message: &str) -> Value {
    let schema = normalize_openai_json_schema(json!(schema_for!(OutputMyProfile)));

    let my_profile_context = my_profile
        .map(to_pretty_json_context)
        .unwrap_or_else(|| "私のプロフィール: なし".to_string());

    json!({
        "model": "gpt-4.1-mini",
        "messages": [
            {
                "role": "system",
                "content": "You must respond strictly in the given JSON schema."
            },
            {
                "role": "system",
                "content": my_profile_context
            },
            {
                "role": "user",
                "content": user_message
            }
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "profile_schema",
                "strict": true,
                "schema": schema
            }
        }
    })
}

pub fn build_match_strategy_prompt(
    my_profile: Option<&Value>,
    match_profile: Option<&Value>,
    user_message: &str,
) -> Value {
    let schema = normalize_openai_json_schema(json!(schema_for!(OutputMatchStrategy)));

    let my_profile_context = my_profile
        .map(to_pretty_json_context)
        .unwrap_or_else(|| "私のプロフィール: なし".to_string());
    let match_profile_context = match_profile
        .map(to_pretty_json_context)
        .unwrap_or_else(|| "相手プロフィール: なし".to_string());

    json!({
        "model": "gpt-4.1-mini",
        "messages": [
            {
                "role": "system",
                "content": "You must respond strictly in the given JSON schema."
            },
            {
                "role": "system",
                "content": my_profile_context
            },
            {
                "role": "system",
                "content": match_profile_context
            },
            {
                "role": "user",
                "content": user_message
            }
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "strategy_schema",
                "strict": true,
                "schema": schema
            }
        }
    })
}

pub fn build_match_messages_prompt(
    my_profile: Option<&Value>,
    match_profile: Option<&Value>,
    match_messages: Option<&Value>,
    user_prompt: &str,
    user_message: &str,
) -> Value {
    let schema = normalize_openai_json_schema(json!(schema_for!(OutputMessage)));

    let my_profile_context = my_profile
        .map(to_pretty_json_context)
        .unwrap_or_else(|| "私のプロフィール: なし".to_string());
    let match_profile_context = match_profile
        .map(to_pretty_json_context)
        .unwrap_or_else(|| "相手プロフィール: なし".to_string());
    let match_messages_context = match_messages
        .map(to_pretty_json_context)
        .unwrap_or_else(|| "過去メッセージ: なし".to_string());
    let user_prompt_context = if user_prompt.trim().is_empty() {
        "ユーザーの要望: なし".to_string()
    } else {
        format!("ユーザーの要望: {user_prompt}")
    };

    json!({
        "model": "gpt-4.1-mini",
        "messages": [
            {
                "role": "system",
                "content": "You must respond strictly in the given JSON schema."
            },
            {
                "role": "system",
                "content": my_profile_context
            },
            {
                "role": "system",
                "content": match_profile_context
            },
            {
                "role": "system",
                "content": match_messages_context
            },
            {
                "role": "system",
                "content": user_prompt_context
            },
            {
                "role": "user",
                "content": user_message
            }
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "message_schema",
                "strict": true,
                "schema": schema
            }
        }
    })
}

pub async fn get_my_profile_json(pool: &SqlitePool, my_id: &str) -> Result<Option<Value>> {
    let row = sqlx::query_scalar::<_, String>(
        r#"
        SELECT profile_json
        FROM my_profiles
        WHERE id = ?
        "#,
    )
    .bind(my_id)
    .fetch_optional(pool)
    .await?;

    if let Some(json_str) = row {
        let value: Value = serde_json::from_str(&json_str)?;
        Ok(Some(value))
    } else {
        Ok(None)
    }
}

pub async fn get_match_profile_json(pool: &SqlitePool, partner_id: &str) -> Result<Option<Value>> {
    let row = sqlx::query_scalar::<_, String>(
        r#"
        SELECT profile_json
        FROM partner_profiles
        WHERE partner_id = ?
        "#,
    )
    .bind(partner_id)
    .fetch_optional(pool)
    .await?;

    if let Some(json_str) = row {
        let value: Value = serde_json::from_str(&json_str)?;
        Ok(Some(value))
    } else {
        Ok(None)
    }
}

pub async fn get_match_messages_json(pool: &SqlitePool, partner_id: &str) -> Result<Option<Value>> {
    let rows = sqlx::query(
        r#"
        SELECT id, partner_id, sent_at, is_mine, body
        FROM messages
        WHERE partner_id = ?
        ORDER BY sent_at ASC, id ASC
        "#,
    )
    .bind(partner_id)
    .fetch_all(pool)
    .await?;

    if rows.is_empty() {
        return Ok(None);
    }

    let messages = rows
        .into_iter()
        .map(|row| {
            json!({
                "id": row.get::<String, _>("id"),
                "partnerId": row.get::<String, _>("partner_id"),
                "sentAt": row.get::<String, _>("sent_at"),
                "isMine": row.get::<i64, _>("is_mine") != 0,
                "body": row.get::<String, _>("body"),
            })
        })
        .collect::<Vec<Value>>();

    Ok(Some(Value::Array(messages)))
}

fn to_pretty_json_context(v: &Value) -> String {
    serde_json::to_string_pretty(v).unwrap_or_else(|_| v.to_string())
}

fn extract_json_content(content: &str) -> Result<String> {
    let trimmed = content.trim();
    if let Some(stripped) = trimmed.strip_prefix("```json") {
        return Ok(stripped
            .trim()
            .trim_end_matches("```")
            .trim()
            .to_string());
    }
    if let Some(stripped) = trimmed.strip_prefix("```") {
        return Ok(stripped
            .trim()
            .trim_end_matches("```")
            .trim()
            .to_string());
    }
    Ok(trimmed.to_string())
}

fn normalize_openai_json_schema(mut schema: Value) -> Value {
    normalize_schema_node(&mut schema);
    schema
}

fn normalize_schema_node(node: &mut Value) {
    let Some(obj) = node.as_object_mut() else {
        return;
    };

    if let Some(properties) = obj.get("properties").and_then(Value::as_object) {
        let mut required = Vec::with_capacity(properties.len());
        for key in properties.keys() {
            required.push(Value::String(key.clone()));
        }
        obj.insert("required".to_string(), Value::Array(required));
        obj.insert("additionalProperties".to_string(), Value::Bool(false));
    }

    if let Some(properties) = obj.get_mut("properties").and_then(Value::as_object_mut) {
        for value in properties.values_mut() {
            normalize_schema_node(value);
        }
    }

    if let Some(items) = obj.get_mut("items") {
        normalize_schema_node(items);
    }

    for key in ["anyOf", "oneOf", "allOf"] {
        if let Some(arr) = obj.get_mut(key).and_then(Value::as_array_mut) {
            for item in arr {
                normalize_schema_node(item);
            }
        }
    }
}
