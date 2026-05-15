# Data Model: F001 Contact Persistence

**Phase**: 1 — Design & Contracts
**Date**: 2026-05-15
**Source**: `spec.md` Key Entities + `research.md` Decision 4

---

## 实体总览

```
ContactFileData (磁盘 JSON)
    ↕ 双向映射（Rust 层）
WorkspaceContact (前端内存类型，TypeScript)
    ↕ Tauri invoke
Rust WorkspaceContact struct (Rust 内存，现有)
```

---

## Entity 1: ContactFileData（磁盘持久化格式）

**定义**: `app_data_dir()/contacts/[sanitized_name].json` 文件的内容结构

**Rust Struct**（新增）:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct ContactFileData {
    pub id: String,
    pub name: String,
    pub attribute_definition: String,
    pub manual_tags: Vec<String>,
    pub distilled_skill: Option<String>,   // 外部 distilled skill MD 文件路径
    pub notes: String,
    pub updated_at: String,                // ISO 8601
    pub skill_file_error: Option<String>,  // 错误信息字符串，null 表示无错误
    pub schema_version: u32,               // 初值 1；读取时检测，F001 不迁移
}
```

**字段约束**:
| 字段 | 必填 | 默认值 | 验证规则 |
|------|------|--------|---------|
| `id` | ✅ | — | 非空字符串 |
| `name` | ✅ | — | 非空字符串（trim 后） |
| `attribute_definition` | ✅ | `""` | 字符串（可空） |
| `manual_tags` | ✅ | `[]` | 字符串数组 |
| `distilled_skill` | ❌ | `null` | 文件路径字符串或 null |
| `notes` | ✅ | `""` | 字符串（可空） |
| `updated_at` | ✅ | 当前时间 | ISO 8601 字符串 |
| `skill_file_error` | ❌ | `null` | 错误信息字符串或 null |
| `schema_version` | ✅ | `1` | 正整数，当前支持版本 `1` |

**JSON 示例**:
```json
{
  "id": "contact-1747270800000",
  "name": "张三",
  "attribute_definition": "普通朋友 · 慢热 / 喜欢轻松表达 / 最近工作压力偏大",
  "manual_tags": ["普通朋友", "慢热", "真诚"],
  "distilled_skill": null,
  "notes": "最近在准备转岗，回复时需要降低压迫感。",
  "updated_at": "2026-05-15T10:00:00.000Z",
  "skill_file_error": null,
  "schema_version": 1
}
```

**文件路径示例**:
- macOS: `~/Library/Application Support/com.social-copilot.app/contacts/zhang-san.json`
- 重名: `zhang-san-2.json`

---

## Entity 2: WorkspaceContact（前端内存类型，TypeScript）

**定义**: 现有 `src/lib/types.ts` 中的 `WorkspaceContact`，最小化调整

**TypeScript 接口**（改动标注）:

```typescript
export interface WorkspaceContact extends Contact {
  /** @deprecated 由 attributeDefinition 吸收 */
  relation?: string;
  attributeDefinition: string;
  lastActive: string;          // UI 派生字段，不持久化
  summary?: string;            // UI 派生字段，不持久化
  schemaVersion?: number;      // ← 新增（可选）；Rust 层写入，前端只读
}
```

**`Contact` 接口** (现有，不修改):
```typescript
export interface Contact {
  id: string;
  name: string;
  avatarUrl?: string;
  skill: ContactSkill;
}
```

**`ContactSkill` 接口** (现有，不修改):
```typescript
export interface ContactSkill {
  manual_tags: string[];
  distilled_traits: DistilledTrait[];   // F001 中始终为 []，F002 写入
  notes?: string;
  updated_at: string;
  skillFileError?: boolean;
  distilled_md_path?: string;           // 对应 ContactFileData.distilled_skill
}
```

---

## Entity 3: ContactStorageIndex（运行时内部）

**定义**: Rust 侧在扫描 `contacts/` 目录时建立的临时映射，不持久化到磁盘

```
contact_id → filename (不含扩展名)
```

**用途**: `save_contact` 时判断是新建（生成新文件名）还是更新（覆盖现有文件）

**实现**: 简单的 `HashMap<String, String>`，在每次 `save_contact` 调用前通过扫描目录重建（无需维护全局状态，避免并发问题）

---

## 映射关系：ContactFileData ↔ WorkspaceContact

### 磁盘 → 内存（load 时）

| ContactFileData 字段 | WorkspaceContact 字段 |
|----------------------|----------------------|
| `id` | `id` |
| `name` | `name` |
| `attribute_definition` | `attributeDefinition` |
| `manual_tags` | `skill.manual_tags` |
| `distilled_skill` | `skill.distilled_md_path` |
| `notes` | `skill.notes` |
| `updated_at` | `skill.updated_at` |
| `skill_file_error` | `skill.skillFileError`（Some(_) → `true`, None → `false`）|
| `schema_version` | `schemaVersion` |
| — | `skill.distilled_traits` = `[]`（F001 不持久化）|
| — | `lastActive` = `updated_at` 格式化（或固定"最近"）|
| — | `skill.distilled_md_path` = `distilled_skill`|

### 内存 → 磁盘（save 时）

| WorkspaceContact 字段 | ContactFileData 字段 |
|----------------------|----------------------|
| `id` | `id` |
| `name` | `name` |
| `attributeDefinition` | `attribute_definition` |
| `skill.manual_tags` | `manual_tags` |
| `skill.distilled_md_path` | `distilled_skill` |
| `skill.notes` | `notes`（None → `""`）|
| `skill.updated_at` | `updated_at`（save 时更新为当前时间）|
| `skill.skillFileError` | `skill_file_error`（`true` → 保留现有错误信息，`false` → `null`）|
| — | `schema_version` = `1`（固定）|

---

## 状态转换

### 联系人生命周期

```
[新建] createContact(name, attributeDefinition)
    → Rust: sanitize_name → check_collision → generate_id → write_file
    → 内存: contacts 列表添加新 WorkspaceContact
    → 工作台: 初始化空 ContactWorkspaceState

[编辑画像] updateContactProfile(contact)
    → Rust: save_contact → 覆盖写入原文件
    → 内存: contacts 列表更新对应 WorkspaceContact

[应用启动] app_startup
    → Rust: scan contacts/ → parse each JSON → filter errors → return Vec<WorkspaceContact>
    → 内存: contacts 初始化为加载结果（替换 INITIAL_CONTACTS）

[文件损坏] load_contacts (partial failure)
    → 跳过损坏文件，该联系人不出现在列表中
    → 错误信息记录在 Rust 日志，前端不感知（F001 范围）
```

### schema_version 版本感知

```
读取文件 → 检测 schema_version
├── version == 1 → 正常加载
├── version > 1  → 日志警告 + 返回 skill_file_error = "Schema 版本不兼容：{version}"
│                → 前端通过 skillFileError = true 展示「skill 信息错误」
└── version 缺失 → 视为 version 1（向后兼容旧格式）
```

---

## 文件系统边界

```
app_data_dir/
└── contacts/                  ← 目录由 load_contacts / save_contact 自动创建
    ├── zhang-san.json
    ├── zhang-san-2.json       ← 重名时追加序号
    ├── li-jing-li.json
    └── contact-1747270000001.json  ← 姓名全为特殊字符时的兜底命名
```

**Invariants**:
- 每个文件名与其内部 `id` 字段存在稳定映射（通过扫描维护）
- `id` 是联系人的唯一标识，文件名是存储的物理地址，两者独立变化不互相依赖
- 文件写入使用 `serde_json::to_string_pretty`（保持可读性）
