# Research: F001 Contact Persistence

**Phase**: 0 — Outline & Research
**Date**: 2026-05-15
**Purpose**: 解决所有技术决策点，为 Phase 1 设计提供确定性基础

---

## Decision 1: 持久化目录路径

**Decision**: 使用 Tauri `app.path().app_data_dir()` 作为持久化根目录，在其下创建 `contacts/` 子目录

**Rationale**:
- `app_data_dir()` 对应 macOS 上的 `~/Library/Application Support/<bundle_id>/`，是 Tauri 推荐的应用数据存储路径
- 与现有 `ai-provider.json` 使用 `app_config_dir()` 的模式保持一致（同一进程边界内）
- 所有读写操作在 Rust 层完成，前端不直接接触路径（Constitution Principle II）

**Alternatives Considered**:
- `app_config_dir()`：已被 `ai-provider.json` 使用，混用会导致目录语义不清晰
- 自定义目录（如 `~/Documents/SocialCopilot/`）：需要额外权限配置，macOS Sandbox 兼容性差
- 单 JSON 文件存所有联系人：不符合 roadmap "按联系人维度存储" 要求，重名处理复杂

---

## Decision 2: JSON 文件命名（sanitize 规则）

**Decision**: 联系人姓名经过 sanitize 后作为文件名，规则如下：
1. 去除前后空白字符
2. 将 Windows/macOS 保留字符 `/ \ : * ? " < > |` 替换为 `-`
3. 多个连续 `-` 合并为一个 `-`
4. 去除首尾 `-`
5. 若结果为空，使用 `contact-{timestamp}` 作为文件名

**Rationale**:
- 保持文件名可读性（中文、字母、数字均保留，只替换非法字符）
- 与 roadmap spec FR-003 一致

**Alternatives Considered**:
- SHA256 哈希：文件名不可读，调试困难
- URL encoding：文件名会含 `%XX` 序列，视觉噪音大
- 仅允许 ASCII：会导致中文姓名全部变成哈希/序号

---

## Decision 3: 重名联系人处理策略

**Decision**: 追加序号策略——`zhang-san.json` → `zhang-san-2.json` → `zhang-san-3.json`

**Rationale**:
- spec 和 roadmap 已明确选择追加序号（spec Assumptions 中记录）
- 行为符合大多数文件管理工具的默认习惯，用户干预成本最低
- 不会静默覆盖已有数据

**Alternatives Considered**:
- 报错/阻止创建：用户体验差，需要额外 UI 提示流程
- 静默覆盖：数据丢失风险，不可接受

**实现细节**:
- 创建文件前检查 `contacts/` 目录下是否存在同名文件
- 序号从 `2` 开始（`name.json` 已是第一个），依次递增直到找到未占用的文件名
- 文件名到联系人的映射关系通过 JSON 内部的 `id` 字段维护

---

## Decision 4: 持久化 JSON Schema（ContactFileData）

**Decision**: 采用扁平结构，字段与 roadmap F001 描述一致：

```json
{
  "id": "zhang-san",
  "name": "张三",
  "attribute_definition": "普通朋友 · 慢热 / 喜欢轻松表达",
  "manual_tags": ["普通朋友", "慢热", "真诚"],
  "distilled_skill": "~/Library/.../distill/zhang-san.md",
  "notes": "最近在准备转岗，回复时需要降低压迫感。",
  "updated_at": "2026-05-15T10:00:00.000Z",
  "skill_file_error": null,
  "schema_version": 1
}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 联系人唯一标识（创建时生成，格式 `contact-{timestamp}`）；存入 JSON 确保 round-trip 一致性 |
| `name` | string | 原始姓名（未 sanitize 的用户输入）|
| `attribute_definition` | string | 属性定义（对应 TS 的 `attributeDefinition`）|
| `manual_tags` | string[] | 手动标签（对应 TS 的 `skill.manual_tags`）|
| `distilled_skill` | string \| null | 外部蒸馏 skill 文件路径（对应 TS 的 `skill.distilled_md_path`）；F001 不实现内容写入，F002 继续扩展 |
| `notes` | string | 备注（对应 TS 的 `skill.notes`）|
| `updated_at` | string | ISO 8601 时间戳（对应 TS 的 `skill.updated_at`）|
| `skill_file_error` | string \| null | 读取 distilled_skill 文件失败时的错误信息；null 表示无错误 |
| `schema_version` | integer | Schema 版本，初值 `1`；用于版本感知，F001 不实现自动迁移 |

**NOT 在 F001 JSON 中持久化的字段**:
- `lastActive`、`summary`：UI 展示派生字段，不持久化
- `distilled_traits`：F002（RAG 记忆）阶段才写入
- `relation`：已标记为 deprecated，F001 不持久化
- `schema_version > 1` 的迁移逻辑：F001 仅读取时检测，不迁移

**Rationale**: 扁平结构与 roadmap 字段列表一一对应，减少嵌套层级；Rust 侧 `ContactFileData` struct 与 JSON 对应，通过 `Into<WorkspaceContact>` 转换为前端类型

---

## Decision 5: TypeScript 类型变更策略（最小化改动）

**Decision**: 保留现有 `WorkspaceContact` 嵌套结构，仅添加 `schemaVersion?: number` 可选字段；映射逻辑完全在 Rust 层

**Rationale**:
- 现有 UI 组件（`profile-panel.tsx`、`chat-workspace.tsx` 等）大量使用 `WorkspaceContact` 类型；改动嵌套结构会需要修改所有组件，超出 F001 范围
- TypeScript 的 `schemaVersion` 字段在 F001 中对前端无实际用途（只在 Rust 层做版本检测），因此设为可选
- 所有 `ContactFileData ↔ WorkspaceContact` 转换在 Rust Command 层完成，前端透明

**具体 TypeScript 变更**:
```typescript
// src/lib/types.ts：WorkspaceContact 添加可选字段
export interface WorkspaceContact extends Contact {
  relation?: string;           // @deprecated，保留兼容
  attributeDefinition: string;
  lastActive: string;
  summary?: string;
  schemaVersion?: number;      // 新增（可选）；Rust 层写入，前端只读
}
```

**Alternatives Considered**:
- 完全重构 TypeScript 类型为扁平结构：改动面太大（所有组件需更新），超出 F001 范围，建议在 F003 engineering-hardening 中统一处理
- 不修改 TypeScript 类型：可行，但 `schemaVersion` 对未来 F002+ 有参考价值，添加可选字段成本极低

---

## Decision 6: Tauri Command 设计（4 个新 Commands）

**Decision**: 新增以下 4 个 Tauri Command：

| Command | 签名 | 用途 |
|---------|------|------|
| `load_contacts` | `(app) -> Result<Vec<WorkspaceContact>, String>` | 启动时扫描 `contacts/` 目录，加载所有联系人 |
| `save_contact` | `(app, contact: WorkspaceContact) -> Result<String, String>` | 新建或更新联系人；返回最终使用的文件名（用于重名检测回调） |
| `delete_contact` | `(app, contact_id: String) -> Result<(), String>` | 按联系人 ID 删除对应 JSON 文件 |
| `sanitize_contact_name` | `(name: String) -> Result<String, String>` | 纯函数：前端可调用以预览 sanitize 后的文件名（辅助 UX，可选） |

**Rationale**:
- `load_contacts` 覆盖 FR-005（启动时全量加载）
- `save_contact` 覆盖 FR-002~FR-004（文件读写、sanitize、重名追加序号）
- `delete_contact` 预留（当前 UI 未实现删除联系人功能，但接口需到位以防后续遗留技术债）
- `sanitize_contact_name` 可选辅助命令，前端新建联系人弹窗中实时预览；若 UI 不展示可不暴露

**Alternatives Considered**:
- 单一 `sync_contacts(Vec<WorkspaceContact>)` 全量同步：原子性更差，每次改动需序列化全部数据
- 使用 Tauri Event 系统替代 Command：无必要，当前场景是前端主动触发，Command 模型更直观

---

## Decision 7: 前端加载时机与初始化策略

**Decision**: 在 `page.tsx` 的 `useEffect` 中（或作为 `useState` 的初始化异步逻辑）调用 `load_contacts`；加载完成前显示加载态（空列表 + loading 指示），加载完成后替换为真实数据

**Rationale**:
- `INITIAL_CONTACTS` 硬编码数据被移除；启动时唯一数据来源是 Rust Command
- 首次启动（无文件）时返回空数组，前端正常显示空态

**Edge Cases**:
- 首次启动（contacts 目录不存在）：Rust 层自动创建目录，返回空数组
- 部分文件损坏：跳过损坏文件，返回可解析的联系人列表 + 收集错误信息（FR-010）
- Tauri API 在 `pnpm dev` 浏览器模式下不可用：保留 `isTauri()` 检测，浏览器模式下使用空列表降级

---

## Decision 8: 保存触发时机

**Decision**: 以下事件触发 `save_contact`：
1. 新建联系人（`createContact`）
2. 编辑 `manual_tags`（`ProfilePanel.onChange`）
3. 编辑 `attributeDefinition`（联系人属性定义更新）
4. 编辑 `notes`（备注更新）

**NOT** 触发保存的事件：
- 草稿（`incomingMessage`, `expectation`）变化：属于工作台状态，不在联系人画像内
- 候选回复变化：属于工作台状态
- `lastActive`、`summary` 变化：UI 派生字段

**Rationale**: 只持久化画像字段（`ContactFileData` 中定义的字段），工作台状态留在内存（peer message history 仍走 localStorage）

---

## NEEDS CLARIFICATION 解决记录

所有 spec 中的 [NEEDS CLARIFICATION] 标记在 spec 生成阶段已全部解决（重名策略 = 追加序号）。无残留待确认项。

---

*输出状态*: ✅ 所有技术决策点已解决，可进入 Phase 1 设计
