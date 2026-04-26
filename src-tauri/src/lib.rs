use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{fs, path::PathBuf};
use tauri::Manager;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct AiSuggestionRequest {
  model: String,
  contact: WorkspaceContact,
  draft: ComposerDraft,
  intent: Intent,
  recent_messages: Vec<Message>,
  workspace_context: WorkspaceContext,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct WorkspaceContact {
  id: String,
  name: String,
  relation: String,
  attribute_definition: String,
  last_active: String,
  summary: String,
  skill: ContactSkill,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct ContactSkill {
  manual_tags: Vec<String>,
  distilled_traits: Vec<DistilledTrait>,
  notes: Option<String>,
  updated_at: String,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct DistilledTrait {
  key: String,
  value: String,
  confidence: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct ComposerDraft {
  incoming_message: String,
  expectation: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct Intent {
  id: String,
  label: String,
  description: String,
  custom: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct Message {
  id: String,
  sender: String,
  text: String,
  timestamp: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct WorkspaceContext {
  source: String,
  generated_at: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AiProviderConfig {
  base_url: String,
  api_key: String,
  model: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Suggestion {
  id: String,
  style: String,
  text: String,
}

#[tauri::command]
fn get_ai_config(app: tauri::AppHandle) -> Result<Option<AiProviderConfig>, String> {
  let path = ai_config_path(&app)?;
  if !path.exists() {
    return Ok(None);
  }

  let content = fs::read_to_string(path).map_err(|err| format!("读取模型配置失败：{err}"))?;
  let config = serde_json::from_str(&content).map_err(|err| format!("解析模型配置失败：{err}"))?;
  Ok(Some(config))
}

#[tauri::command]
fn save_ai_config(app: tauri::AppHandle, config: AiProviderConfig) -> Result<(), String> {
  validate_ai_config(&config)?;

  let path = ai_config_path(&app)?;
  let content =
    serde_json::to_string_pretty(&config).map_err(|err| format!("序列化模型配置失败：{err}"))?;
  fs::write(path, content).map_err(|err| format!("保存模型配置失败：{err}"))?;
  Ok(())
}

#[tauri::command]
async fn generate_ai_suggestions(
  app: tauri::AppHandle,
  request: AiSuggestionRequest,
) -> Result<Vec<Suggestion>, String> {
  let config = get_ai_config(app)?.ok_or_else(|| {
    "尚未配置真实模型。请点击“配置模型”，填写 Base URL、API Key 和模型名。".to_string()
  })?;

  validate_ai_config(&config)?;

  let endpoint = chat_completions_endpoint(&config.base_url);
  let system_prompt = build_system_prompt(&request);
  let user_prompt = build_user_prompt(&request);

  let response = reqwest::Client::new()
    .post(endpoint)
    .bearer_auth(config.api_key)
    .json(&json!({
      "model": config.model,
      "messages": [
        { "role": "system", "content": system_prompt },
        { "role": "user", "content": user_prompt }
      ],
      "temperature": 0.7,
      "n": 3
    }))
    .send()
    .await
    .map_err(|err| format!("请求模型失败：{err}"))?;

  let status = response.status();
  let body = response
    .text()
    .await
    .map_err(|err| format!("读取模型响应失败：{err}"))?;

  if !status.is_success() {
    return Err(format!(
      "模型请求失败（HTTP {}）：{}",
      status.as_u16(),
      truncate_error_body(&body)
    ));
  }

  parse_openai_suggestions(&body)
}

fn ai_config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let dir = app
    .path()
    .app_config_dir()
    .map_err(|err| format!("获取应用配置目录失败：{err}"))?;
  fs::create_dir_all(&dir).map_err(|err| format!("创建应用配置目录失败：{err}"))?;
  Ok(dir.join("ai-provider.json"))
}

fn validate_ai_config(config: &AiProviderConfig) -> Result<(), String> {
  if config.base_url.trim().is_empty() {
    return Err("Base URL 不能为空。".to_string());
  }
  if config.api_key.trim().is_empty() {
    return Err("API Key 不能为空。".to_string());
  }
  if config.model.trim().is_empty() {
    return Err("模型名不能为空。".to_string());
  }
  Ok(())
}

fn chat_completions_endpoint(base_url: &str) -> String {
  let trimmed = base_url.trim().trim_end_matches('/');
  if trimmed.ends_with("/chat/completions") {
    trimmed.to_string()
  } else {
    format!("{trimmed}/chat/completions")
  }
}

fn build_system_prompt(request: &AiSuggestionRequest) -> String {
  format!(
    "你是 Social Copilot 的中文回复助手。请根据联系人画像和本次上下文，生成 2-3 条可直接复制发送的中文候选回复。要求：自然、具体、符合用户预期，不要解释推理过程。\n\n联系人：{}\n关系：{}\n属性定义：{}\n联系人摘要：{}\n手动标签：{}\n备注：{}",
    request.contact.name,
    request.contact.relation,
    request.contact.attribute_definition,
    request.contact.summary,
    request.contact.skill.manual_tags.join("、"),
    request.contact.skill.notes.clone().unwrap_or_default()
  )
}

fn build_user_prompt(request: &AiSuggestionRequest) -> String {
  format!(
    "联系人发来的消息：{}\n我的交流预期：{}\n意图标签：{}\n意图描述：{}\n请返回 2-3 条候选回复，每条风格略有区分。",
    request.draft.incoming_message,
    request.draft.expectation,
    request.intent.label,
    request.intent.description
  )
}

fn parse_openai_suggestions(body: &str) -> Result<Vec<Suggestion>, String> {
  let value: serde_json::Value =
    serde_json::from_str(body).map_err(|err| format!("解析模型响应 JSON 失败：{err}"))?;
  let choices = value
    .get("choices")
    .and_then(|choices| choices.as_array())
    .ok_or_else(|| "模型响应缺少 choices 字段。".to_string())?;

  let styles = ["自然", "稳妥", "直接"];
  let suggestions: Vec<Suggestion> = choices
    .iter()
    .enumerate()
    .filter_map(|(index, choice)| {
      let text = choice
        .get("message")
        .and_then(|message| message.get("content"))
        .and_then(|content| content.as_str())
        .or_else(|| choice.get("text").and_then(|text| text.as_str()))?
        .trim()
        .to_string();

      if text.is_empty() {
        return None;
      }

      Some(Suggestion {
        id: format!("ai-{index}"),
        style: styles.get(index).unwrap_or(&"候选").to_string(),
        text,
      })
    })
    .take(3)
    .collect();

  if suggestions.is_empty() {
    return Err("模型没有返回可用候选回复。".to_string());
  }

  Ok(suggestions)
}

fn truncate_error_body(body: &str) -> String {
  const MAX_LEN: usize = 300;
  let trimmed = body.trim();
  if trimmed.chars().count() <= MAX_LEN {
    trimmed.to_string()
  } else {
    format!("{}…", trimmed.chars().take(MAX_LEN).collect::<String>())
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      get_ai_config,
      save_ai_config,
      generate_ai_suggestions
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
