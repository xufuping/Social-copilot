# Tauri Command Contracts: F001 Contact Persistence

**Phase**: 1 — Design & Contracts
**Date**: 2026-05-15
**Scope**: 新增 Rust Command + 前端 invoke 封装

---

## 概述

本 feature 新增 4 个 Tauri Command，统一在 `src-tauri/src/lib.rs` 中实现，并在 `tauri::generate_handler![]` 中注册。前端通过 `src/lib/contact-storage.ts` 封装调用。

---

## Command 1: `load_contacts`

**用途**: 应用启动时加载所有持久化联系人

### Rust 签名

```rust
#[tauri::command]
async fn load_contacts(app: tauri::AppHandle) -> Result<Vec<WorkspaceContact>, String>
```

### 前端调用

```typescript
// src/lib/contact-storage.ts
export async function loadContacts(): Promise<WorkspaceContact[]>
```

### 行为规范

- 在 `app_data_dir()/contacts/` 下扫描所有 `*.json` 文件
- 若目录不存在，自动创建并返回空数组
- 每个文件独立解析：解析成功 → 加入返回列表；解析失败 → 跳过（记录 debug 日志）
- 检测 `schema_version`：`> 1` 时在该联系人的 `skill.skillFileError` 中返回版本不兼容信息
- 按 `updated_at` 降序排列（最近更新的在前）

### 响应示例

```typescript
// 成功
[
  {
    id: "contact-1747270800000",
    name: "张三",
    attributeDefinition: "普通朋友 · 慢热",
    lastActive: "最近",
    skill: {
      manual_tags: ["普通朋友"],
      distilled_traits: [],
      notes: "备注",
      updated_at: "2026-05-15T10:00:00.000Z",
      skillFileError: false,
      distilled_md_path: null,
    },
    schemaVersion: 1,
  }
]

// 无联系人（首次启动）
[]
```

### 错误处理

| 错误场景 | 行为 |
|---------|------|
| `app_data_dir()` 获取失败 | 返回 `Err("获取应用数据目录失败：{err}")` |
| 目录创建失败 | 返回 `Err("创建联系人目录失败：{err}")` |
| 单个文件解析失败 | 跳过该文件，不影响其他联系人加载 |

---

## Command 2: `save_contact`

**用途**: 新建或更新联系人画像数据

### Rust 签名

```rust
#[tauri::command]
async fn save_contact(
    app: tauri::AppHandle,
    contact: WorkspaceContact,
) -> Result<String, String>
// 返回值：最终写入的文件名（不含路径和扩展名），用于前端调试/日志
```

### 前端调用

```typescript
// src/lib/contact-storage.ts
export async function saveContact(contact: WorkspaceContact): Promise<string>
```

### 行为规范

1. **新建** (`save_contact` 时联系人 ID 在目录中无对应文件):
   - sanitize `contact.name` 得到候选文件名 `base`
   - 检查 `contacts/<base>.json` 是否存在：不存在 → 使用 `base.json`
   - 存在且内部 `id` 不同 → 追加序号：`base-2.json`、`base-3.json`... 直到找到未被占用的文件名
   - 写入 `ContactFileData`（`schema_version = 1`，`updated_at = now()`）

2. **更新** (目录中已存在该联系人 ID 对应的文件):
   - 扫描目录找到包含 `id = contact.id` 的文件
   - 覆盖写入该文件（保持文件名不变）
   - 更新 `updated_at = now()`

### 响应示例

```typescript
// 成功（返回文件名）
"zhang-san"          // 新建首个
"zhang-san-2"        // 重名追加
```

### 错误处理

| 错误场景 | 行为 |
|---------|------|
| `name` 为空 | 返回 `Err("联系人姓名不能为空")` |
| sanitize 后文件名为空 | 使用 `contact-{timestamp}` 兜底 |
| 文件写入失败（磁盘满等） | 返回 `Err("保存联系人失败：{err}")` |
| JSON 序列化失败 | 返回 `Err("序列化联系人数据失败：{err}")` |

---

## Command 3: `delete_contact`

**用途**: 删除联系人（预留接口，当前 UI 未暴露删除功能）

### Rust 签名

```rust
#[tauri::command]
async fn delete_contact(
    app: tauri::AppHandle,
    contact_id: String,
) -> Result<(), String>
```

### 前端调用

```typescript
// src/lib/contact-storage.ts
export async function deleteContact(contactId: string): Promise<void>
```

### 行为规范

- 扫描目录找到包含 `id = contact_id` 的文件
- 找到 → `fs::remove_file` 删除
- 找不到 → 视为成功（幂等操作）

### 错误处理

| 错误场景 | 行为 |
|---------|------|
| 文件删除失败 | 返回 `Err("删除联系人失败：{err}")` |
| `app_data_dir()` 失败 | 返回 `Err("获取应用数据目录失败：{err}")` |

---

## Command 4: `sanitize_contact_name`

**用途**: 纯函数辅助命令，前端可调用以预览 sanitize 后的存储名（可选，用于 UX）

### Rust 签名

```rust
#[tauri::command]
fn sanitize_contact_name(name: String) -> String
// 纯函数，无副作用，无需 AppHandle
```

### 前端调用

```typescript
// src/lib/contact-storage.ts
export async function sanitizeContactName(name: string): Promise<string>
```

### 行为规范

严格按 research.md Decision 2 的 sanitize 规则执行（同步函数，无 I/O）

---

## 前端封装模块：`src/lib/contact-storage.ts`

```typescript
import { invoke } from "@tauri-apps/api/core";
import type { WorkspaceContact } from "@/lib/types";

/** 检测是否在 Tauri 环境中运行 */
function isTauriEnv(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function loadContacts(): Promise<WorkspaceContact[]> {
  if (!isTauriEnv()) return [];
  return invoke<WorkspaceContact[]>("load_contacts");
}

export async function saveContact(contact: WorkspaceContact): Promise<string> {
  if (!isTauriEnv()) return "";
  return invoke<string>("save_contact", { contact });
}

export async function deleteContact(contactId: string): Promise<void> {
  if (!isTauriEnv()) return;
  return invoke<void>("delete_contact", { contactId });
}

export async function sanitizeContactName(name: string): Promise<string> {
  if (!isTauriEnv()) return name;
  return invoke<string>("sanitize_contact_name", { name });
}
```

---

## 现有 Commands（保持不变）

以下 3 个 Command 为现有实现，F001 不修改：

| Command | 用途 |
|---------|------|
| `get_ai_config` | 读取 AI Provider 配置 |
| `save_ai_config` | 写入 AI Provider 配置 |
| `generate_ai_suggestions` | 生成 AI 候选回复建议 |

---

## `tauri::generate_handler![]` 注册（更新后）

```rust
.invoke_handler(tauri::generate_handler![
    get_ai_config,
    save_ai_config,
    generate_ai_suggestions,
    load_contacts,        // ← 新增
    save_contact,         // ← 新增
    delete_contact,       // ← 新增
    sanitize_contact_name // ← 新增
])
```

---

## 跨端数据契约一致性（Constitution Principle V 验证）

| TypeScript 字段（camelCase） | Rust 字段（snake_case，serde camelCase） | 类型 |
|------------------------------|------------------------------------------|------|
| `id` | `id` | `string` / `String` |
| `name` | `name` | `string` / `String` |
| `attributeDefinition` | `attribute_definition` | `string` / `String` |
| `skill.manual_tags` | `skill.manual_tags` | `string[]` / `Vec<String>` |
| `skill.distilled_md_path` | `skill.distilled_md_path` | `string \| undefined` / `Option<String>` |
| `skill.notes` | `skill.notes` | `string \| undefined` / `Option<String>` |
| `skill.updated_at` | `skill.updated_at` | `string` / `String` |
| `skill.skillFileError` | `skill.skill_file_error` (serde alias) | `boolean \| undefined` / `bool` |
| `schemaVersion` | `schema_version` | `number \| undefined` / `Option<u32>` |

> **注意**: `WorkspaceContact` 的 Rust struct 使用 `#[serde(rename_all = "camelCase")]`，确保 JSON 序列化与 TypeScript 字段名一致。
