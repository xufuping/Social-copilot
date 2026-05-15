# Tasks: F001 Contact Persistence

**Input**: Design documents from `specs/001-contact-persistence/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/tauri-commands.md ✅ | quickstart.md ✅

**Tests**: 仅在 Rust 层为核心纯函数（sanitize、collision detection）添加 `#[cfg(test)]` 单元测试；不引入新测试框架。

**Organization**: 按 User Story 分 Phase，每个 Phase 可独立验收。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无共享依赖）
- **[Story]**: 对应 spec.md 中的 User Story（US1–US4）
- 文件路径以项目根目录为基准

---

## Phase 1: Setup（共享基础设施）

**Purpose**: 创建新文件骨架，为 Rust 和前端做准备

- [x] T001 创建 `src/lib/contact-storage.ts`，包含 `isTauriEnv()` 检测工具函数与 4 个空 stub export（`loadContacts` / `saveContact` / `deleteContact` / `sanitizeContactName`）

---

## Phase 2: Foundational — Rust 数据层基础（阻塞所有 User Story）

**Purpose**: 新增持久化所需的核心 struct 与工具函数，所有 Command 实现均依赖本 Phase

**⚠️ CRITICAL**: US1–US4 的实现均需本 Phase 完成

- [x] T002 在 `src-tauri/src/lib.rs` 顶部新增 `ContactFileData` struct（含 `#[derive(Debug, Clone, Serialize, Deserialize)]`、`#[serde(rename_all = "snake_case")]`，字段：`id` / `name` / `attribute_definition` / `manual_tags` / `distilled_skill` / `notes` / `updated_at` / `skill_file_error` / `schema_version`）

- [x] T003 [P] 在 `src-tauri/src/lib.rs` 中实现 `sanitize_filename(name: &str) -> String` 纯函数（去除首尾空格；将 `/ \ : * ? " < > |` 替换为 `-`；合并连续 `-`；去除首尾 `-`；结果为空时返回 `contact-{timestamp_ms}`）

- [x] T004 [P] 在 `src-tauri/src/lib.rs` 中实现 `contacts_dir(app: &tauri::AppHandle) -> Result<PathBuf, String>` 函数（获取 `app_data_dir()/contacts/`，自动创建目录）

- [x] T005 在 `src-tauri/src/lib.rs` 中实现 `find_contact_file_by_id(dir: &Path, contact_id: &str) -> Option<PathBuf>` 函数（扫描 `contacts/` 下所有 `*.json`，返回内部 `id` 字段匹配的文件路径）

- [x] T006 在 `src-tauri/src/lib.rs` 中实现 `contact_file_to_workspace_contact(data: ContactFileData) -> WorkspaceContact` 映射函数（`attribute_definition` → `attributeDefinition`；`manual_tags` / `notes` / `updated_at` / `distilled_skill` → `skill.*`；`skill_file_error: Some(_)` → `skillFileError: true`；`schema_version` → `schemaVersion`；`lastActive` 设为 `updated_at` 的简短人类可读格式或固定 `"最近"`）

- [x] T007 在 `src-tauri/src/lib.rs` 中实现 `workspace_contact_to_file_data(contact: &WorkspaceContact) -> ContactFileData` 映射函数（`attributeDefinition` → `attribute_definition`；`skill.*` → 对应字段；`schema_version` 固定为 `1`；`updated_at` 由调用方设为当前时间）

- [x] T008 [P] 在 `src/lib/types.ts` 的 `WorkspaceContact` interface 末尾添加可选字段 `schemaVersion?: number`（一行改动）

**Checkpoint**: `cargo check --manifest-path src-tauri/Cargo.toml` 通过；User Story 实现可开始

---

## Phase 3: User Story 1 — 重启应用后联系人数据完整恢复 (Priority: P1) 🎯 MVP

**Goal**: 应用关闭后重新启动，所有已创建联系人及其全部字段可完整恢复

**Independent Test**: 新建联系人"测试恢复" → 填写属性定义 → 关闭并重启 Tauri 应用 → 验证联系人仍在列表中且字段一致

### Implementation for User Story 1

- [x] T009 [US1] 在 `src-tauri/src/lib.rs` 实现 `load_contacts` Tauri Command：扫描 `contacts_dir()`、逐文件解析 `ContactFileData`（失败则跳过）、检测 `schema_version > 1` 时设 `skill_file_error`、调用 `contact_file_to_workspace_contact` 映射、按 `updated_at` 降序排列后返回 `Vec<WorkspaceContact>`

- [x] T010 [US1] 在 `src-tauri/src/lib.rs` 实现 `save_contact` Tauri Command：调用 `workspace_contact_to_file_data` 获取 file data；先执行 `find_contact_file_by_id` 找现有文件（更新路径）；未找到则调用 `sanitize_filename` 生成候选名，循环追加 `-2` / `-3` 直到不冲突；写入 `serde_json::to_string_pretty`；返回最终文件名（不含路径和扩展名）

- [x] T011 [US1] 在 `src-tauri/src/lib.rs` 的 `tauri::generate_handler![]` 中注册 `load_contacts` 和 `save_contact`（共 5 个 command）

- [x] T012 [P] [US1] 在 `src/lib/contact-storage.ts` 中将 `loadContacts()` 和 `saveContact()` stub 替换为真实实现（`invoke<WorkspaceContact[]>("load_contacts")` / `invoke<string>("save_contact", { contact })`）

- [x] T013 [US1] 在 `src/app/page.tsx` 中添加 `isContactsLoading` state（初值 `true`）；添加 `useEffect(() => { loadContacts().then(setContacts).finally(() => setIsContactsLoading(false)) }, [])` 替换启动时的 `INITIAL_CONTACTS` 初始化（Tauri 环境下）；非 Tauri 环境（`!isTauriEnv()`）保留 `INITIAL_CONTACTS` 作为浏览器开发模式降级数据

- [x] T014 [US1] 在 `src/app/page.tsx` 的 `createContact()` 函数末尾添加 `saveContact(nextContact).catch(err => { updateSelectedWorkspaceState(s => ({ ...s, error: err instanceof Error ? err.message : "保存联系人失败" })) })`；异步调用，不阻塞 UI 状态更新

**Checkpoint**: `cargo check` + `pnpm lint` + `pnpm build` 通过；Tauri 环境下新建联系人 → 重启 → 恢复 ✅

---

## Phase 4: User Story 2 — AI 链路接入真实持久化画像数据 (Priority: P2)

**Goal**: AI 请求体中 `contact` 字段来源于本地持久化数据；用户编辑标签/备注后持久化，下次 AI 请求可读取最新画像

**Independent Test**: 创建联系人"持久化测试" + 属性定义"直接简洁" → 触发 AI 建议 → 确认 Rust 日志中 system prompt 包含"直接简洁"（非 Mock 字符串）

### Implementation for User Story 2

- [x] T015 [US2] 在 `src/app/page.tsx` 中新增 `updateContactSkill(contactId: string, nextSkill: ContactSkill)` 函数：更新 `contacts` 数组中对应联系人的 `skill` 字段 + 同步调用 `saveContact(updatedContact)`（错误写入该联系人工作台 `error` 字段）

- [x] T016 [US2] 在 `src/components/chat-workspace.tsx` 的 `ChatWorkspaceProps` interface 中添加可选 prop `onContactSkillChange?: (nextSkill: ContactSkill) => void`；在组件 body 中渲染 `<ProfilePanel skill={contact.skill} onChange={onContactSkillChange ?? (() => {})} />` （放在 `<ConversationArea>` 上方，`contact` 存在时才渲染；需在文件顶部 import `ProfilePanel` 和 `ContactSkill`）

- [x] T017 [US2] 在 `src/app/page.tsx` 的 `<ChatWorkspace>` 处透传 `onContactSkillChange`：添加 prop `onContactSkillChange={(nextSkill) => updateContactSkill(selectedContact.id, nextSkill)}`

- [x] T018 [US2] 审查 `src/app/page.tsx` 中的 `sendToModel()` 函数：确认 `AiSuggestionRequest.contact` 来源是 `selectedContact`（从 `contacts` state 取，已由 `loadContacts()` 初始化），不存在硬编码 Mock 联系人对象；若发现残留 Mock 引用则删除

**Checkpoint**: 标签编辑 → 重启 → 标签保持 ✅；AI 请求 contact 字段含真实属性定义 ✅

---

## Phase 5: User Story 3 — 特殊字符姓名文件读写 (Priority: P3)

**Goal**: 含 `/`、`:`、`*`、空格、中文等特殊字符的联系人姓名可正常保存和恢复

**Independent Test**: 创建姓名为 "Alice/Bob:张三*" 的联系人 → 重启 → 联系人恢复且字段无误

### Implementation for User Story 3

- [x] T019 [P] [US3] 在 `src-tauri/src/lib.rs` 末尾 `#[cfg(test)]` 模块中为 `sanitize_filename` 添加单元测试：覆盖 Windows 保留字符（`/ : * ? " < > | \`）、前后空格、纯中文姓名、重复连字符、首尾连字符、空字符串（期望返回 `contact-` 前缀）等边界情形

- [x] T020 [US3] 在 `src-tauri/src/lib.rs` 实现 `sanitize_contact_name` Tauri Command（调用 `sanitize_filename` 并返回结果）并注册到 `tauri::generate_handler![]`

- [x] T021 [US3] 在 `src/lib/contact-storage.ts` 中将 `sanitizeContactName()` stub 替换为真实实现（`invoke<string>("sanitize_contact_name", { name })`）

**Checkpoint**: `cargo test --manifest-path src-tauri/Cargo.toml` 中 sanitize 测试全部通过 ✅

---

## Phase 6: User Story 4 — 重名联系人处理策略 (Priority: P3)

**Goal**: 创建与已有联系人同名的新联系人时，两者均被保存且互不覆盖

**Independent Test**: 创建两个名为"同名用户"的联系人 → 重启 → 列表中两个联系人均存在，各自字段独立

### Implementation for User Story 4

- [x] T022 [US4] 在 `src-tauri/src/lib.rs` 的 `#[cfg(test)]` 模块中为 `save_contact` 的碰撞检测逻辑添加单元测试：首个同名联系人生成 `[name].json`，第二个生成 `[name]-2.json`，第三个生成 `[name]-3.json`；以及验证通过 `id` 更新时不改变文件名

**Checkpoint**: `cargo test` 中碰撞检测测试全部通过 ✅；手动验证两个同名联系人均可恢复 ✅

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 预留接口完善、最终质量门禁

- [x] T023 [P] 在 `src-tauri/src/lib.rs` 实现 `delete_contact` Tauri Command（通过 `find_contact_file_by_id` 定位文件 → `fs::remove_file`；找不到视为成功）并注册到 `tauri::generate_handler![]`

- [x] T024 [P] 在 `src/lib/contact-storage.ts` 将 `deleteContact()` stub 替换为真实实现（`invoke<void>("delete_contact", { contactId })`）

- [x] T025 [P] 最终质量门禁：`cargo check --manifest-path src-tauri/Cargo.toml` + `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm lint` + `pnpm build`；全部通过后完成 F001

---

## Dependencies & Execution Order

### Phase 依赖关系

- **Phase 1（Setup）**: 无依赖，立即开始
- **Phase 2（Foundational）**: 依赖 Phase 1（T001）；完成前**阻塞**所有 User Story
- **Phase 3（US1 P1）**: 依赖 Phase 2 全部完成
- **Phase 4（US2 P2）**: 依赖 Phase 3 完成（`loadContacts` + `saveContact` 已就绪）
- **Phase 5（US3 P3）**: 依赖 Phase 2（`sanitize_filename` 函数）；可与 Phase 4 并行
- **Phase 6（US4 P3）**: 依赖 Phase 3（`save_contact` collision 逻辑）；可与 Phase 4/5 并行
- **Phase 7（Polish）**: 依赖所有 User Story Phase 完成

### User Story 依赖关系

- **US1 (P1)**: Phase 2 完成后可开始；无其他依赖
- **US2 (P2)**: 依赖 US1（需要 `loadContacts` + `contacts` 状态已从持久化初始化）
- **US3 (P3)**: 依赖 Phase 2（`sanitize_filename` 实现）；与 US2 无依赖
- **US4 (P3)**: 依赖 T010（`save_contact` 中的碰撞检测逻辑）；与 US2/US3 无依赖

### Phase 2 内部并行机会

- T003 + T004 可并行（不同函数，无互相依赖）
- T006 + T007 可并行（映射方向相反，互不依赖）
- T008 独立于 Rust 改动，可与所有 Rust 任务并行

---

## Parallel Example: Phase 2

```bash
# 可同时进行的 Phase 2 任务：
Task: "T003 sanitize_filename 实现（src-tauri/src/lib.rs）"
Task: "T004 contacts_dir 实现（src-tauri/src/lib.rs）"
Task: "T008 types.ts 添加 schemaVersion 字段"

# T002 先完成后，T006 和 T007 可并行：
Task: "T006 contact_file_to_workspace_contact 映射"
Task: "T007 workspace_contact_to_file_data 映射"
```

---

## Implementation Strategy

### MVP First（仅 User Story 1）

1. 完成 Phase 1：T001
2. 完成 Phase 2：T002–T008（基础）
3. 完成 Phase 3：T009–T014（US1 核心）
4. **STOP and VALIDATE**：`pnpm tauri dev` → 新建联系人 → 重启 → 确认恢复
5. US1 验收通过后继续 US2

### Incremental Delivery

1. Setup + Foundational → 基础就绪
2. US1（T009–T014）→ 恢复能力上线 → **MVP！**
3. US2（T015–T018）→ AI 画像闭环
4. US3（T019–T021）→ 特殊字符健壮性
5. US4（T022）→ 重名保护
6. Polish（T023–T025）→ 预留接口 + 质量门禁

---

## Notes

- `[P]` 任务可与同 Phase 内其他 `[P]` 任务并行执行（不同文件，无共享状态）
- Rust 侧改动集中在 `src-tauri/src/lib.rs`（单文件）；注意 `#[allow(dead_code)]` 处理临时未使用的 struct
- `INITIAL_CONTACTS` 在 Tauri 环境下被 `loadContacts()` 替代；保留作浏览器开发模式降级，以 `isTauriEnv()` 区分
- `pnpm dev`（浏览器模式）下所有 `contact-storage.ts` 函数返回空值/静默忽略，不影响前端开发调试
- 每个 Phase 完成后执行 `cargo check` + `pnpm lint` 确保不引入回归
