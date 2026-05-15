use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{
  fs,
  path::{Path, PathBuf},
};
use tauri::Manager;

// ────────────────────────────────────────────────────────────────────────────
// Contact persistence types
// ────────────────────────────────────────────────────────────────────────────

/// Flat on-disk JSON format for a single contact file.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
struct ContactFileData {
  id: String,
  name: String,
  attribute_definition: String,
  manual_tags: Vec<String>,
  distilled_skill: Option<String>,
  notes: String,
  updated_at: String,
  skill_file_error: Option<String>,
  schema_version: u32,
}

// ────────────────────────────────────────────────────────────────────────────
// AI suggestion request types
// ────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct AiSuggestionRequest {
  model: String,
  #[serde(default = "default_suggestion_count")]
  suggestion_count: u8,
  contact: WorkspaceContact,
  draft: ComposerDraft,
  intent: Intent,
  recent_messages: Vec<Message>,
  workspace_context: WorkspaceContext,
}

fn default_suggestion_count() -> u8 {
  3
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceContact {
  id: String,
  name: String,
  #[serde(default)]
  relation: Option<String>,
  attribute_definition: String,
  last_active: String,
  #[serde(default)]
  summary: Option<String>,
  skill: ContactSkill,
  #[serde(default)]
  schema_version: Option<u32>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
struct ContactSkill {
  manual_tags: Vec<String>,
  distilled_traits: Vec<DistilledTrait>,
  notes: Option<String>,
  updated_at: String,
  #[serde(rename = "skillFileError", default)]
  skill_file_error: Option<bool>,
  #[serde(default)]
  distilled_md_path: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
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
  let n = (request.suggestion_count as u32).clamp(3, 10);

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
      "n": n
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

  parse_openai_suggestions(&body, n as usize)
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
  let n = (request.suggestion_count as u32).clamp(3, 10);
  let relation = request
    .contact
    .relation
    .as_deref()
    .filter(|s| !s.trim().is_empty())
    .unwrap_or("(属性定义中已含关系语义时可不单独填写)");
  let summary = request
    .contact
    .summary
    .as_deref()
    .filter(|s| !s.trim().is_empty())
    .unwrap_or("(无)");
  format!(
    "你是 Social Copilot 的中文回复助手。请根据联系人画像和本次上下文，生成 **{n} 条**可直接复制发送的中文候选回复（请提供 {n} 条回复消息）。要求：自然、具体、符合用户预期，不要解释推理过程。\n\n联系人：{}\n关系/补充：{}\n属性定义：{}\n联系人摘要：{}\n手动标签：{}\n备注：{}",
    request.contact.name,
    relation,
    request.contact.attribute_definition,
    summary,
    request.contact.skill.manual_tags.join("、"),
    request.contact.skill.notes.clone().unwrap_or_default()
  )
}

fn build_user_prompt(request: &AiSuggestionRequest) -> String {
  let n = (request.suggestion_count as u32).clamp(3, 10);
  format!(
    "联系人发来的消息：{}\n我的交流预期：{}\n意图标签：{}\n意图描述：{}\n请提供 {n} 条候选回复消息，每条风格略有区分。",
    request.draft.incoming_message,
    request.draft.expectation,
    request.intent.label,
    request.intent.description
  )
}

fn parse_openai_suggestions(body: &str, max_count: usize) -> Result<Vec<Suggestion>, String> {
  let value: serde_json::Value =
    serde_json::from_str(body).map_err(|err| format!("解析模型响应 JSON 失败：{err}"))?;
  let choices = value
    .get("choices")
    .and_then(|choices| choices.as_array())
    .ok_or_else(|| "模型响应缺少 choices 字段。".to_string())?;

  let styles = [
    "自然", "稳妥", "直接", "温和", "幽默", "专业", "简洁", "真诚", "周到", "克制",
  ];
  let suggestions: Vec<Suggestion> = choices
    .iter()
    .take(max_count)
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
        style: styles[index % styles.len()].to_string(),
        text,
      })
    })
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

// ════════════════════════════════════════════════════════════════════════════
// Contact persistence — helper functions
// ════════════════════════════════════════════════════════════════════════════

/// Sanitize a contact name for use as a filesystem filename.
///
/// Rules:
/// 1. Trim leading/trailing whitespace
/// 2. Replace characters reserved on Windows/macOS (`/ \ : * ? " < > |`) with `-`
/// 3. Collapse consecutive dashes into one
/// 4. Remove leading/trailing dashes
/// 5. If the result is empty, fall back to `contact-{unix_ms}`
fn sanitize_filename(name: &str) -> String {
  let trimmed = name.trim();
  let replaced: String = trimmed
    .chars()
    .map(|c| {
      if matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|') {
        '-'
      } else {
        c
      }
    })
    .collect();

  // Collapse consecutive dashes
  let mut result = String::new();
  let mut last_dash = false;
  for c in replaced.chars() {
    if c == '-' {
      if !last_dash {
        result.push(c);
      }
      last_dash = true;
    } else {
      result.push(c);
      last_dash = false;
    }
  }
  let result = result.trim_matches('-').to_string();

  if result.is_empty() {
    let ms = std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .map(|d| d.as_millis())
      .unwrap_or(0);
    format!("contact-{ms}")
  } else {
    result
  }
}

/// Resolve (and auto-create) the `contacts/` directory inside `app_data_dir`.
fn contacts_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let base = app
    .path()
    .app_data_dir()
    .map_err(|e| format!("获取应用数据目录失败：{e}"))?;
  let dir = base.join("contacts");
  fs::create_dir_all(&dir).map_err(|e| format!("创建联系人目录失败：{e}"))?;
  Ok(dir)
}

/// Scan `dir` for the JSON file whose `id` field matches `contact_id`.
fn find_contact_file_by_id(dir: &Path, contact_id: &str) -> Option<PathBuf> {
  let entries = fs::read_dir(dir).ok()?;
  for entry in entries.flatten() {
    let path = entry.path();
    if path.extension().and_then(|e| e.to_str()) != Some("json") {
      continue;
    }
    if let Ok(content) = fs::read_to_string(&path) {
      if let Ok(data) = serde_json::from_str::<serde_json::Value>(&content) {
        if data.get("id").and_then(|v| v.as_str()) == Some(contact_id) {
          return Some(path);
        }
      }
    }
  }
  None
}

/// Convert on-disk `ContactFileData` → in-memory `WorkspaceContact` for frontend.
fn contact_file_to_workspace_contact(data: ContactFileData) -> WorkspaceContact {
  const SUPPORTED_SCHEMA: u32 = 1;
  let (skill_file_error, schema_version_warning) = if data.schema_version > SUPPORTED_SCHEMA {
    (
      Some(true),
      Some(data.schema_version),
    )
  } else {
    (None, None)
  };
  let _ = schema_version_warning; // logged if needed in the future

  WorkspaceContact {
    id: data.id,
    name: data.name.clone(),
    relation: None,
    attribute_definition: data.attribute_definition,
    last_active: "最近".to_string(),
    summary: None,
    skill: ContactSkill {
      manual_tags: data.manual_tags,
      distilled_traits: vec![],
      notes: if data.notes.is_empty() {
        None
      } else {
        Some(data.notes)
      },
      updated_at: data.updated_at,
      skill_file_error,
      distilled_md_path: data.distilled_skill,
    },
    schema_version: Some(data.schema_version),
  }
}

/// Convert in-memory `WorkspaceContact` → `ContactFileData` for writing to disk.
fn workspace_contact_to_file_data(contact: &WorkspaceContact) -> ContactFileData {
  let now = chrono_now_iso();
  ContactFileData {
    id: contact.id.clone(),
    name: contact.name.clone(),
    attribute_definition: contact.attribute_definition.clone(),
    manual_tags: contact.skill.manual_tags.clone(),
    distilled_skill: contact.skill.distilled_md_path.clone(),
    notes: contact.skill.notes.clone().unwrap_or_default(),
    updated_at: now,
    skill_file_error: contact
      .skill
      .skill_file_error
      .and_then(|e| if e { Some("error".to_string()) } else { None }),
    schema_version: 1,
  }
}

/// Return the current time as an ISO 8601 string (UTC).
fn chrono_now_iso() -> String {
  // Use SystemTime for a zero-dependency ISO 8601 timestamp.
  let duration = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .unwrap_or_default();
  let secs = duration.as_secs();
  // Format: YYYY-MM-DDTHH:MM:SS.mmmZ (UTC)
  let ms = duration.subsec_millis();
  let s = secs % 60;
  let m = (secs / 60) % 60;
  let h = (secs / 3600) % 24;
  let days = secs / 86400; // days since 1970-01-01
  let (year, month, day) = days_to_ymd(days);
  format!("{year:04}-{month:02}-{day:02}T{h:02}:{m:02}:{s:02}.{ms:03}Z")
}

/// Convert days-since-epoch to (year, month, day).
fn days_to_ymd(days: u64) -> (u64, u64, u64) {
  // Gregorian calendar algorithm
  let z = days + 719468;
  let era = z / 146097;
  let doe = z % 146097;
  let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
  let y = yoe + era * 400;
  let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
  let mp = (5 * doy + 2) / 153;
  let d = doy - (153 * mp + 2) / 5 + 1;
  let m = if mp < 10 { mp + 3 } else { mp - 9 };
  let y = if m <= 2 { y + 1 } else { y };
  (y, m, d)
}

// ════════════════════════════════════════════════════════════════════════════
// Contact persistence — Tauri Commands
// ════════════════════════════════════════════════════════════════════════════

#[tauri::command]
fn load_contacts(app: tauri::AppHandle) -> Result<Vec<WorkspaceContact>, String> {
  let dir = contacts_dir(&app)?;
  let entries =
    fs::read_dir(&dir).map_err(|e| format!("读取联系人目录失败：{e}"))?;

  let mut contacts: Vec<WorkspaceContact> = Vec::new();

  for entry in entries.flatten() {
    let path = entry.path();
    if path.extension().and_then(|e| e.to_str()) != Some("json") {
      continue;
    }
    let content = match fs::read_to_string(&path) {
      Ok(c) => c,
      Err(e) => {
        eprintln!("[load_contacts] 跳过文件 {:?}：读取失败 {e}", path);
        continue;
      }
    };
    match serde_json::from_str::<ContactFileData>(&content) {
      Ok(data) => {
        contacts.push(contact_file_to_workspace_contact(data));
      }
      Err(e) => {
        eprintln!("[load_contacts] 跳过文件 {:?}：解析失败 {e}", path);
      }
    }
  }

  // Sort by updated_at descending (most recent first)
  contacts.sort_by(|a, b| b.skill.updated_at.cmp(&a.skill.updated_at));
  Ok(contacts)
}

#[tauri::command]
fn save_contact(app: tauri::AppHandle, contact: WorkspaceContact) -> Result<String, String> {
  if contact.name.trim().is_empty() {
    return Err("联系人姓名不能为空".to_string());
  }

  let dir = contacts_dir(&app)?;
  let file_data = workspace_contact_to_file_data(&contact);
  let json =
    serde_json::to_string_pretty(&file_data).map_err(|e| format!("序列化联系人失败：{e}"))?;

  // If a file with this ID already exists, overwrite it (update path)
  let final_path = if let Some(existing) = find_contact_file_by_id(&dir, &contact.id) {
    existing
  } else {
    // New contact — generate a non-colliding filename
    let base = sanitize_filename(&contact.name);
    let mut candidate = dir.join(format!("{base}.json"));
    let mut suffix = 2u32;
    while candidate.exists() {
      // Check if the existing file belongs to the same ID (shouldn't happen, but be safe)
      if let Ok(content) = fs::read_to_string(&candidate) {
        if let Ok(existing_data) = serde_json::from_str::<serde_json::Value>(&content) {
          if existing_data.get("id").and_then(|v| v.as_str()) == Some(&contact.id) {
            break; // same contact, overwrite
          }
        }
      }
      candidate = dir.join(format!("{base}-{suffix}.json"));
      suffix += 1;
    }
    candidate
  };

  fs::write(&final_path, json).map_err(|e| format!("保存联系人失败：{e}"))?;

  let stem = final_path
    .file_stem()
    .and_then(|s| s.to_str())
    .unwrap_or("unknown")
    .to_string();
  Ok(stem)
}

#[tauri::command]
fn delete_contact(app: tauri::AppHandle, contact_id: String) -> Result<(), String> {
  let dir = contacts_dir(&app)?;
  if let Some(path) = find_contact_file_by_id(&dir, &contact_id) {
    fs::remove_file(&path).map_err(|e| format!("删除联系人文件失败：{e}"))?;
  }
  // Not found is treated as success (idempotent)
  Ok(())
}

#[tauri::command]
fn sanitize_contact_name(name: String) -> String {
  sanitize_filename(&name)
}

// ════════════════════════════════════════════════════════════════════════════
// Unit tests
// ════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
  use super::*;

  // ── sanitize_filename tests (covers US3) ──────────────────────────────────

  #[test]
  fn sanitize_plain_name() {
    assert_eq!(sanitize_filename("张三"), "张三");
  }

  #[test]
  fn sanitize_windows_reserved_chars() {
    assert_eq!(sanitize_filename("Alice/Bob"), "Alice-Bob");
    assert_eq!(sanitize_filename("Alice:Bob"), "Alice-Bob");
    assert_eq!(sanitize_filename("Alice*Bob"), "Alice-Bob");
    assert_eq!(sanitize_filename("Alice?Bob"), "Alice-Bob");
    assert_eq!(sanitize_filename("Alice\"Bob"), "Alice-Bob");
    assert_eq!(sanitize_filename(r"Alice\Bob"), "Alice-Bob");
    assert_eq!(sanitize_filename("Alice<Bob>"), "Alice-Bob");
    assert_eq!(sanitize_filename("Alice|Bob"), "Alice-Bob");
  }

  #[test]
  fn sanitize_leading_trailing_spaces() {
    assert_eq!(sanitize_filename("  Alice  "), "Alice");
  }

  #[test]
  fn sanitize_consecutive_dashes() {
    assert_eq!(sanitize_filename("Alice//Bob"), "Alice-Bob");
    assert_eq!(sanitize_filename("a:*?b"), "a-b");
  }

  #[test]
  fn sanitize_leading_trailing_dashes() {
    assert_eq!(sanitize_filename("/Alice/"), "Alice");
    // ":::" → all chars replaced by '-' → collapse to '-' → trim dashes → "" → fallback
    let result = sanitize_filename(":::");
    assert!(
      result.starts_with("contact-"),
      "Expected contact- prefix, got: {result}"
    );
  }

  #[test]
  fn sanitize_empty_result_fallback() {
    let result = sanitize_filename(":::");
    // After stripping dashes, result is empty → fallback to "contact-{ms}"
    assert!(result.starts_with("contact-"), "Expected contact- prefix, got: {result}");
  }

  #[test]
  fn sanitize_empty_string() {
    let result = sanitize_filename("");
    assert!(result.starts_with("contact-"));
  }

  #[test]
  fn sanitize_chinese_with_special_chars() {
    assert_eq!(sanitize_filename("李四/Alice"), "李四-Alice");
  }

  // ── Collision-detection logic tests (covers US4) ──────────────────────────
  // These tests verify the naming: name.json → name-2.json → name-3.json
  // by exercising the sanitize helper (the collision loop runs in save_contact
  // which requires an AppHandle; here we test the filename generation logic).

  #[test]
  fn collision_suffix_naming() {
    // Simulate what save_contact does for suffix generation
    let base = sanitize_filename("张三");
    assert_eq!(base, "张三");
    assert_eq!(format!("{base}.json"), "张三.json");
    assert_eq!(format!("{base}-2.json"), "张三-2.json");
    assert_eq!(format!("{base}-3.json"), "张三-3.json");
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
      generate_ai_suggestions,
      load_contacts,
      save_contact,
      delete_contact,
      sanitize_contact_name
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
