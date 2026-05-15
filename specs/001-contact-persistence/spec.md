# Feature Specification: F001 Contact Persistence

**Feature Branch**: `001-contact-persistence`

**Created**: 2026-05-14

**Status**: Draft

**Input**: User description: "F001 contact-persistence — 联系人画像本地持久化。范围见 roadmap.md F001 章节。须遵守 constitution.md v1.0.1 全部 NON-NEGOTIABLE 原则。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — 重启应用后联系人数据完整恢复 (Priority: P1)

用户在一次会话中创建了多个联系人，填写了各自的属性定义、标签、蒸馏技能与备注；关闭应用后再次启动，所有联系人数据应与关闭前完全一致，无需重新录入。

**Why this priority**: 这是本 feature 最核心的价值承诺——数据持久化。若重启后数据丢失，所有后续 AI 画像能力均无法建立在可靠基础上。

**Independent Test**: 可通过"创建联系人 → 填写完整字段 → 关闭并重启应用 → 验证联系人列表与字段一致"完整测试，无需其他 feature 支撑。

**Acceptance Scenarios**:

1. **Given** 应用已创建联系人"Alice"并填写了属性定义、标签和备注，**When** 用户关闭应用并重新启动，**Then** 联系人列表中仍显示"Alice"，且所有字段值与上次保存时一致。
2. **Given** 应用已创建 5 个联系人，**When** 用户重启应用，**Then** 所有 5 个联系人均可恢复，且顺序与字段内容无误。
3. **Given** 应用无已保存联系人，**When** 用户启动应用，**Then** 联系人列表为空，应用正常显示空态，无错误提示。

---

### User Story 2 — AI 回复建议使用真实持久化画像数据（非 Mock）(Priority: P2)

用户为联系人"Bob"录入了属性定义，点击"生成建议"后，AI 返回的候选回复应基于 Bob 的持久化画像数据，而非内置的 Mock 预置数据。

**Why this priority**: 这是持久化能力从"数据存储"到"真实驱动 AI"的闭环验证，也是 roadmap F001 范围第 7 条的直接体现。

**Independent Test**: 在完成 User Story 1 的基础上，可通过"录入自定义属性 → 请求 AI 建议 → 核查请求体 contact 字段来源"独立验证。

**Acceptance Scenarios**:

1. **Given** 联系人"Bob"已保存了属性定义"重视效率、偏好简短回复"，**When** 用户在 Bob 的工作台触发 AI 建议，**Then** 发往 AI 的请求体中 `contact` 字段应包含"Bob"的真实属性定义，而非 Mock 占位文本。
2. **Given** 应用从未使用过 Mock 预置数据（Mock 数据已被本地持久化数据替代），**When** 用户切换联系人并分别请求 AI 建议，**Then** 每个联系人对应的 `contact` 字段各自独立，互不干扰。

---

### User Story 3 — 处理特殊字符联系人姓名的文件读写 (Priority: P3)

用户创建姓名含有特殊字符（如 `/`、`:`、`*`、空格、中文等）的联系人，系统应能正常保存并恢复，不因文件名限制导致数据丢失或报错。

**Why this priority**: 这是健壮性要求，不影响核心价值路径，但若缺失会导致特定用户数据静默丢失或崩溃。

**Independent Test**: 可通过"创建含特殊字符姓名的联系人 → 重启应用 → 验证可恢复"独立测试。

**Acceptance Scenarios**:

1. **Given** 用户创建联系人，姓名为"李四/Alice"（含斜杠），**When** 系统保存该联系人，**Then** 系统对姓名进行 sanitize 后生成合法文件名，联系人数据正常写入，重启后可恢复。
2. **Given** 用户创建联系人，姓名含有 Windows 保留字符（`<>:"/\|?*`）或前后空格，**When** 保存时，**Then** 系统自动清理姓名并生成合法文件名，不抛出未处理异常。
3. **Given** 联系人姓名全为特殊字符无法提取有效文件名，**When** 保存时，**Then** 系统以可读错误提示告知用户，不丢失用户已输入的其他字段数据。

---

### User Story 4 — 重名联系人的处理策略 (Priority: P3)

当用户新建的联系人与已有联系人同名时，系统应有明确行为——本 spec 选择追加序号策略（见 Assumptions）。

**Why this priority**: 这是数据完整性的边界保障，若缺失可能导致重名时数据静默覆盖。

**Independent Test**: 可通过"创建同名联系人 → 验证两个联系人均存在并有不同内部标识"独立测试。

**Acceptance Scenarios**:

1. **Given** 已有联系人"Charlie"（存储为 `charlie.json`），**When** 用户再次创建名为"Charlie"的联系人，**Then** 系统以追加序号方式创建 `charlie-2.json`，两个联系人在列表中均可见，数据互相独立。
2. **Given** 已有联系人"Charlie"和"Charlie-2"，**When** 用户创建第三个同名联系人，**Then** 系统创建 `charlie-3.json`，序号依次递增。

---

### Edge Cases

- 当磁盘空间不足无法写入文件时，系统应提示用户写入失败，不丢失当前内存中的联系人数据。
- 当持久化文件被外部工具损坏（JSON 格式非法）时，该联系人的加载应以可读错误提示呈现，不影响其他联系人的正常加载。
- 当持久化文件的 `schema_version` 值高于当前应用支持的版本时，应给出版本不兼容提示，不静默解析失败。
- 联系人姓名为空字符串时，系统应拒绝创建并提示用户。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 定义包含以下字段的联系人数据结构：`name`（联系人姓名）、`attribute_definition`（属性定义）、`manual_tags`（手动标签列表）、`distilled_skill`（蒸馏技能内容）、`notes`（备注）、`updated_at`（最后更新时间戳）、`skill_file_error`（技能文件错误信息，可为空）、`schema_version`（初值为整数 `1`）。
- **FR-002**: 系统 MUST 在应用数据目录（通过 Tauri `app_data_dir()` 解析）下，按联系人维度将数据读写为独立的 `[sanitized_name].json` 文件，每个联系人对应一个文件。
- **FR-003**: 系统 MUST 实现文件名 sanitize 规则：去除前后空格、将 Windows/macOS 保留字符（`/ \ : * ? " < > |`）替换为连字符，多个连续连字符合并为一个，去除首尾连字符；sanitize 后若结果为空，则以 `contact-[index]` 形式命名。
- **FR-004**: 系统 MUST 在检测到重名（sanitized 后文件名冲突）时，采用追加序号策略（`name.json`、`name-2.json`、`name-3.json`……）创建新文件，已有同名文件不被覆盖。
- **FR-005**: 系统 MUST 在应用启动时扫描应用数据目录下所有联系人 JSON 文件，加载并恢复全部联系人数据。
- **FR-006**: 系统 MUST 为 `schema_version` 字段预留升级接口：读取文件时检测版本号并记录日志；若检测到不支持的版本应向用户展示可读错误，而非静默丢弃数据；**当前版本不实现自动迁移**。
- **FR-007**: AI 生成链路 MUST 接入持久化后的本地联系人画像数据：发送 AI 请求时，`contact` 字段 MUST 来源于当前选中联系人的本地持久化数据，禁止使用 Mock 预置对象。
- **FR-008**: 持久化文件写入 MUST 经由 Tauri Rust Command 层执行；前端不得直接访问文件系统或绕过 Rust 层写入磁盘。
- **FR-009**: 系统 MUST 对每次文件写入操作返回明确的成功/失败结果；写入失败时，前端 MUST 在对应联系人工作台显示可读错误，不丢弃用户的内存中数据。
- **FR-010**: 持久化文件读取失败（JSON 解析错误、文件损坏）时，系统 MUST 跳过该文件并向前端报告 `skill_file_error`，不因单个文件损坏导致整体加载中断。

### Key Entities

- **Contact**（联系人）：核心数据单元，持有 `name`、`attribute_definition`、`manual_tags`、`distilled_skill`、`notes`、`updated_at`、`skill_file_error`、`schema_version` 字段；在前端以 `WorkspaceContact` 类型表示，在 Rust 端以对应 struct 表示，两端字段保持 `camelCase` 序列化一致。
- **ContactFile**（联系人文件）：应用数据目录下按 `[sanitized_name].json` 命名的 JSON 文件，与 Contact 一对一对应（重名时序号区分）。
- **AppDataDir**（应用数据目录）：由 Tauri `app_data_dir()` 解析的本机目录，是所有联系人文件的根目录；对用户不可见，由系统托管。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户关闭并重新启动应用后，所有已保存联系人的全部字段可完整恢复，数据与保存前一致（零数据丢失）。
- **SC-002**: AI 建议请求体中的 `contact` 字段 100% 来源于本地持久化数据，不包含任何 Mock 预置内容。
- **SC-003**: 含特殊字符或中文的联系人姓名均可被正确 sanitize 并成功保存，覆盖 ASCII 特殊字符全集与常见中文字符。
- **SC-004**: 重名联系人通过序号追加策略区分，在同名场景下原有联系人数据不被覆盖。
- **SC-005**: 单个联系人文件损坏时，其余联系人的加载不受影响，应用可正常使用；损坏联系人以错误标记显示而非静默消失。
- **SC-006**: 所有持久化相关的读写操作均通过质量门禁（`pnpm lint` + `pnpm build` + `cargo check`），无类型错误或编译错误。

## Assumptions

- 用户设备具有足够的本地磁盘空间（≥ 1 MB）用于存储联系人 JSON 文件；极端磁盘满场景以错误提示处理，不做自动压缩或清理。
- 联系人数量在本期不超过数百个；不需要分页加载或懒加载优化，全量一次性加载即可满足性能需求。
- 本 feature 不实现 schema 自动迁移；`schema_version` 仅用于版本感知与报错提示，未来升级路径由后续 feature 决策。
- 重名冲突解决策略选用**追加序号**（`name.json` → `name-2.json`），而非报错中断或静默覆盖；这与大多数文件管理工具的默认行为一致，对用户干预要求最低。
- 联系人头像、富文本备注等扩展字段不在本 feature 范围内；数据结构设计时为扩展预留空间，但不实现相关 UI。
- RAG 记忆检索能力（roadmap F002）依赖本 feature 建立的持久化数据契约，但本 feature 不实现检索功能。
- 本 feature 中 `distilled_skill` 字段延续现有蒸馏链路，不引入新的 AI 蒸馏触发逻辑；仅确保该字段的读写在持久化层得到正确支持。
- 应用数据目录路径由 Tauri 运行时提供，开发模式与生产模式路径可能不同；两种模式均需能正确解析并使用。
