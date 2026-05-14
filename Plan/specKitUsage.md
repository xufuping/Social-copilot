# Spec-Kit 多工具协作使用方案

> **文档定位**：本文是 spec-kit 日常使用指南，重点说明如何在每个开发阶段**自主选择最适合的 AI 工具**。
> 接入步骤请参考 `Plan/importSpecKit.md`，治理原则与合规边界请参考 `.specify/memory/constitution.md`。

---

## 0. 当前仓库的 Spec-Kit 安装现状（重要前置事实）

执行过的初始化命令实际为：

```bash
specify init --here --force --integration claude
```

由此带来的几个**与原 importSpecKit.md 描述略有出入**的实情，先在这里对齐：

| 事项 | 当前实情 |
|---|---|
| Skill 文件位置 | `.claude/skills/speckit-*/SKILL.md`（不是 `.cursor/skills/`） |
| `CLAUDE.md` | 存在，仅含 SPECKIT START/END 标记块，提示 AI 读取当前 plan |
| `.specify/integration.json` | `installed_integrations: ["claude"]` |
| 扩展安装清单 | `installed: []`（暂未装 staff-review / verify 等第三方扩展） |
| Git 钩子 | `.specify/extensions.yml` 中已启用 `before_*` / `after_*` 自动提交钩子（默认 optional） |
| `.specify/memory/constitution.md` | 已按当前项目宪法（v1.0.0）填充，**不再是模板占位符** |

**结论**：Cursor 完全可以直接使用现有 `.claude/skills/`，**无需再跑一次 `--integration cursor`**。

---

## 0.5 路线图（Roadmap）使用方式

`.specify/memory/roadmap.md` 与 `constitution.md` **平级**，是 AI 在 spec-kit 流水线中的长期记忆之一。
它把 `Plan/1.1.md` 散文式叙述切成 AI 友好的 feature 条目，便于按切片推进。

**职责分工**：

| 文件 | 角色 | 改动是否触发 constitution 版本 |
|---|---|---|
| `.specify/memory/constitution.md` | 跨 feature 的治理原则（NON-NEGOTIABLE 等） | 是 |
| `.specify/memory/roadmap.md` | 当前活动路线图（feature 切片 + 状态机） | **否**（属于规划层面） |
| `Plan/1.1.md` | 历史产品规划散文（保留只读） | 不适用 |
| `specs/00N-xxx/` | 单个 feature 的具体规格（spec/plan/tasks） | 不适用 |

**状态机**：每个 feature 条目都有一个 Status，spec-kit 流水线**严格按状态推进**：

| Status | 允许的下一步 SKILL 调用 |
|---|---|
| `Backlog` | 仅允许 `speckit-specify`（首次开工） |
| `InProgress` | `speckit-clarify` / `speckit-plan` / `speckit-tasks` / `speckit-implement` 全部允许 |
| `Done` | 仅允许 read-only 引用（不再触发任何写 SKILL） |
| `Deferred` / `Dropped` | 禁止任何 SKILL 触发，除非先手动改回 `Backlog` |

**典型操作**：

1. **查看路线图**：直接打开 `.specify/memory/roadmap.md`，或在 Cursor Agent 里
   `@.specify/memory/roadmap.md 当前应该做哪个 feature？`
2. **开新 feature**：找到下一个 `Backlog` 条目（如 `F001 contact-persistence`），复制其
   "范围 / 不含 / 前置依赖"作为 `speckit-specify` skill 的输入。
3. **状态推进**：feature 一旦 `speckit-specify` 成功落地 `specs/00N-xxx/`，**立即手动**把
   roadmap 中该条目改 `InProgress`；合并回 main 后改 `Done`。
4. **新增 / 拆分 feature**：直接编辑 `roadmap.md`，遵守文末"路线图维护规则"。

---

## 1. 在 Cursor IDE 中调用 Spec-Kit 的标准方案

Cursor Agent 会**自动加载** `.claude/skills/speckit-*/SKILL.md` 作为 Agent Skill（可在聊天的 skills 列表中看到 `speckit-constitution` / `speckit-specify` / `speckit-plan` / `speckit-tasks` / `speckit-implement` / `speckit-clarify` / `speckit-analyze` / `speckit-checklist` / `speckit-taskstoissues` 共 9 项）。所以 Cursor 内的调用本质上是**让 Agent 读对应 SKILL.md 并按其 Outline 执行**。

### 1.1 三种触发方式（按推荐度从高到低）

#### 方式 A：自然语言点名 Skill（推荐，最稳）

在 Cursor 右侧 Chat / Composer 中切到 **Agent** 模式（必须是 Agent，不能是 Ask），然后直接说：

```
请使用 speckit-specify skill 为我创建 Feature 规格：
功能名称：contact-persistence（联系人画像本地持久化）
需求描述：……
```

Cursor 会读取 `.claude/skills/speckit-specify/SKILL.md`，按其 Outline 跑：检查 pre-hook → 解析模板 → 调脚本（如 `create-new-feature.sh`）→ 写 `specs/xxx/spec.md` → 跑 post-hook。

> Skill 名字用**连字符**（`speckit-specify`），不是点号。

#### 方式 B：`@` 引用 SKILL.md + 输入参数

如果 Agent 没自动捕获 skill（极少数情况），手动 `@` 喂上下文：

```
@.claude/skills/speckit-specify/SKILL.md
@.specify/memory/constitution.md

执行该 skill 的 Outline，参数（$ARGUMENTS）：
功能名称：contact-persistence
需求描述：……
```

这种方式可强制 Cursor 完全照搬 SKILL.md 的执行流程，适合首跑、对比 diff、或需要审阅每一步时。

#### 方式 C：在终端用 Claude Code CLI（备选）

如果你电脑上装了 `claude` CLI，可以在仓库根目录跑：

```bash
cd /Users/wudingxuan/web/test/Social-copilot
claude
# 然后在 Claude Code 里输入
/speckit.specify ……
```

仅当你**确实想用 Claude Code 那套点号斜杠命令**时再走这条路。日常推荐方式 A。

### 1.2 各阶段对应的 Cursor 触发模板

| 阶段 | Skill 名 | Cursor Agent 一句话模板 |
|---|---|---|
| 治理原则修订 | `speckit-constitution` | `请用 speckit-constitution skill 更新宪法：……（修订点）` |
| 功能规格 | `speckit-specify` | `请用 speckit-specify skill 创建 Feature：功能名 + 需求描述` |
| 需求澄清 | `speckit-clarify` | `请用 speckit-clarify skill 对当前 spec 提问澄清` |
| 检查清单 | `speckit-checklist` | `请用 speckit-checklist skill 为本 Feature 生成验收 checklist` |
| 技术计划 | `speckit-plan` | `请用 speckit-plan skill 生成 plan，技术栈约束如下：……` |
| 一致性分析 | `speckit-analyze` | `请用 speckit-analyze skill 跨 spec/plan/constitution 做一致性检查` |
| 任务拆解 | `speckit-tasks` | `请用 speckit-tasks skill 基于当前 plan/data-model 拆任务` |
| 代码实现 | `speckit-implement` | `请用 speckit-implement skill 执行 Phase 1 第 1.1–1.3 任务`（按需逐批） |
| 任务转 Issue | `speckit-taskstoissues` | `请用 speckit-taskstoissues skill 把 tasks.md 转为 GitHub Issues` |

> 注意：Cursor 内的 `/`（斜杠）面板调出来的是 **Cursor 自己的 commands**，并不是 spec-kit skill。spec-kit skill 不会出现在那个面板里——直接打字调用即可。

### 1.3 与自动 Git 钩子的配合

`.specify/extensions.yml` 已开启所有 `before_*` / `after_*` 钩子。每次执行 spec-kit skill 时，Cursor Agent 会按 SKILL.md 的 Pre/Post-Execution Checks 触发对应钩子：

- **`before_constitution`**：`speckit.git.initialize`（**mandatory**）。仓库已是 git 仓库，钩子是 no-op，无需手动处理。
- **`before_specify`**：`speckit.git.feature`（**mandatory**）。会先帮你建一条 `001-xxx` 分支，再开始写 spec。
- **其余 `before_*` / `after_*`**：均为 `optional: true` 的 commit 钩子。Agent 会**问你是否提交**，按需回答即可。

如果不想被 commit 钩子打扰，把 `.specify/extensions.yml` 中对应钩子改 `enabled: false`；不要直接删除整段，便于后续恢复。

### 1.4 Cursor 中的 Implement 阶段最佳实践

`speckit-implement` 会要求 Agent 自动跑完整张 `tasks.md`。在 Cursor 里**推荐两段式**而不是一把梭：

1. **小批量驱动**：用方式 A 触发，但在 prompt 里限定范围——例如"**只执行 Phase 1（T001–T010）**"，跑完让你 review 一轮再继续。
2. **跨任务 Review**：每跑完一个 Phase，让 Cursor 跑一次：

   ```
   请对照 @specs/xxx/spec.md 与 @.specify/memory/constitution.md，
   review 刚才 Phase 1 的实现是否：
   1. 满足验收标准；2. 不违反五条 Core Principles；
   3. 通过 pnpm lint / pnpm build / cargo check。
   ```

这套节奏对应 §1.2 中 `speckit-analyze` 与"阶段 7 实现校验"，可视作 Cursor 内的轻量 verify。

### 1.5 在 Cursor 中的最小手势速查

| 想做的事 | 在 Cursor 里怎么做 |
|---|---|
| 写第一个 Feature 规格 | Agent 模式 → 输入 `请用 speckit-specify skill 创建 Feature：……` |
| 跑一段实现 | Agent 模式 → `@specs/xxx/tasks.md` + `请用 speckit-implement skill 执行 Phase 1 全部任务` |
| 查看当前宪法/规格 | 直接在编辑器中打开 `.specify/memory/constitution.md` / `specs/xxx/spec.md` |
| 检查 spec 与实现是否一致 | Agent 模式 → `请用 speckit-analyze skill 检查 spec/plan/constitution 一致性` |
| 调整 git 钩子是否自动提交 | 编辑 `.specify/extensions.yml`，把对应钩子 `enabled` 改 `false` |
| 想要等价的 Claude Code 体验 | 终端进入仓库 → `claude` → 用 `/speckit.xxx` 点号命令 |

---

## 核心思路：规格文件是各工具之间的交接物

spec-kit 的每个阶段都会在 `specs/xxx/` 目录下产出或消费一个 Markdown 文件：

```
constitution.md → spec.md → plan.md → tasks.md → [实现代码] → [审查报告]
```

这些文件是**纯文本**，任何工具都能读写。这意味着：
- **阶段切换 = 换一个工具打开对应文件继续工作**
- 不同工具之间不需要重新传递上下文
- 某个阶段用哪个模型，只影响那个阶段的产出质量

---

## 推荐的三段式工作流

```
┌─────────────────────────────────────────────────────────────────┐
│  阶段一：探索 + 推理（Claude / DeepSeek 等推理能力强的模型）          │
│  constitution → specify → clarify → plan                        │
│  产出：.specify/memory/constitution.md                           │
│       specs/xxx/spec.md + plan.md + research.md + tasks.md      │
├─────────────────────────────────────────────────────────────────┤
│  阶段二：代码实现（Cursor Chat / Zed / Windsurf 等 IDE）            │
│  implement（读取 tasks.md，逐任务编写代码）                         │
│  产出：实际代码变更                                                 │
├─────────────────────────────────────────────────────────────────┤
│  阶段三：校验 + 审查（GPT / Claude Opus 等擅长严谨审查的模型）         │
│  verify + review（对照 spec.md 检验实现，代码质量审查）               │
│  产出：审查报告 / 修复任务                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 各阶段详细说明

### 阶段 0：治理原则（Constitution）

**目标**：建立全局约束，后续所有 spec 和实现都以此为基础。

| 工具选项 | 调用方式 | 适用场景 |
|---|---|---|
| **Claude Code CLI** | `/speckit.constitution <描述>` | 首选，原生支持，命令结果直接写入文件 |
| **Cursor Agent 模式** | `/speckit-constitution <描述>` | 在 IDE 内完成，方便同时查看现有代码 |
| **任意 AI（手动）** | 直接编辑 `.specify/memory/constitution.md` | 已有清晰想法时，跳过 AI 直接写 |

**示例（Claude Code）：**
```
/speckit.constitution

参考 Plan/1.1.md 中的技术架构边界与产品约束，生成项目治理原则。
重点包含：Tauri Rust Command 架构锁定、联系人为核心组织单位、
手动粘贴为主链路、TypeScript 严格模式、pnpm lint/build/cargo check 必须通过。
```

**产出文件**：`.specify/memory/constitution.md`

---

### 阶段 1：功能规格（Specify）

**目标**：用自然语言描述"要做什么、为什么"，生成结构化的用户故事与验收标准。

**关键原则**：此阶段**只描述 What 和 Why，不涉及技术选型**。

| 工具选项 | 调用方式 | 适用场景 |
|---|---|---|
| **Claude Code CLI** | `/speckit.specify <需求描述>` | 首选，Claude 擅长理解模糊需求并补全细节 |
| **Claude（OpenRouter API）** | 将 spec-template.md 内容作为 system prompt，填写需求后直接生成 | 无 Claude Code 时的替代方案（见下方说明） |
| **Cursor Agent 模式** | `/speckit-specify <需求描述>` | 需求与现有代码强关联时使用 |
| **DeepSeek / Gemini** | 同 OpenRouter 替代方案 | 适合大量需求文档整理（token 成本低） |

**OpenRouter / 纯 API 替代方案说明：**

当你想用 OpenRouter 接入的模型（而非 Claude Code CLI）完成 specify 阶段时：

1. 打开 `.specify/templates/spec-template.md`，复制模板内容
2. 在你的 AI 对话工具（如 ChatGPT、Claude.ai、任意支持自定义 system prompt 的客户端）中：
   - System prompt：粘贴 spec-template.md 内容 + 项目 constitution.md 内容
   - User message：描述你的需求
3. 将 AI 输出保存为 `specs/xxx/spec.md`

**示例（Claude Code）：**
```
/speckit.specify

功能名称：contact-persistence（联系人画像本地持久化）

需求描述：
用户创建的联系人信息（昵称、属性定义、蒸馏 skill 等）目前只保存在内存中，
重启应用后全部丢失。需要将联系人数据持久化到本地文件，让用户积累长期联系人画像。
所有文件读写必须通过 Tauri 层，不暴露文件路径给前端。
```

**产出文件**：`specs/001-contact-persistence/spec.md`

---

### 阶段 2：需求澄清（Clarify）— 可选

**目标**：消除 spec 中的模糊点，减少实现阶段的返工。

**适用时机**：需求边界不清晰、有多种合理方案需要提前决策时。

| 工具选项 | 调用方式 | 说明 |
|---|---|---|
| **Claude Code CLI** | `/speckit.clarify` | 自动就 spec 提问，回答后更新 spec.md |
| **Cursor Agent 模式** | `/speckit-clarify` | 同上 |
| **手动澄清** | 直接编辑 spec.md 中的 Clarifications 章节 | 已知答案时最快 |

**示例：**
```
/speckit.clarify

重点澄清：
1. 联系人重名时的处理策略
2. contact_name 含特殊字符（斜杠、冒号等）时的文件名处理规则
3. Schema 版本升级时的数据迁移策略
```

---

### 阶段 3：技术实现计划（Plan）

**目标**：基于 spec.md，结合指定技术栈，生成具体的技术方案、数据模型、API 契约。

**关键原则**：此阶段**才指定技术栈和架构方案**。

| 工具选项 | 调用方式 | 适用场景 |
|---|---|---|
| **Claude Code CLI** | `/speckit.plan <技术栈描述>` | 首选，Claude 对 Rust + TypeScript 全栈方案理解深 |
| **DeepSeek（OpenRouter）** | 同 API 替代方案，使用 plan-template.md | 适合技术方案确定、只需生成格式化文档时 |
| **Cursor Agent 模式** | `/speckit-plan <技术栈描述>` | 需要同时参考已有代码结构时 |

**示例（Claude Code）：**
```
/speckit.plan

技术栈约束：
- Rust 端：serde_json 读写，app_data_dir() 获取存储目录，
  命名为 contacts/[sanitized_name].json；Tauri Command 命名
  contact_save、contact_load_all、contact_delete
- TypeScript 端：类型定义与 Rust struct 字段保持一致（camelCase 序列化）
- 不引入 SQLite 或其他数据库，当前阶段纯文件系统
- schema_version 字段初始值为 1，升级时自动迁移或提示

请同时生成 data-model.md（数据结构定义）和 research.md（Tauri 文件系统 API 调研）。
```

**产出文件**：
- `specs/001-contact-persistence/plan.md`
- `specs/001-contact-persistence/data-model.md`
- `specs/001-contact-persistence/research.md`

---

### 阶段 4：一致性分析（Analyze）— 可选但推荐

**目标**：在生成任务清单前，检查 spec.md / plan.md / constitution.md 三者之间是否存在矛盾或覆盖缺口。

| 工具选项 | 调用方式 | 说明 |
|---|---|---|
| **Claude Code CLI** | `/speckit.analyze` | 推荐，跨文档检查能力强 |
| **GPT-4o（OpenRouter）** | 将三个文件内容贴入，要求做一致性审查 | Claude Code 不可用时的替代 |

---

### 阶段 5：任务拆解（Tasks）

**目标**：将 plan.md 拆解为带依赖关系、有明确文件路径的可执行任务清单。

| 工具选项 | 调用方式 | 说明 |
|---|---|---|
| **Claude Code CLI** | `/speckit.tasks` | 首选 |
| **Cursor Agent 模式** | `/speckit-tasks` | 同上 |
| **手动编写** | 直接创建 `specs/xxx/tasks.md` | 任务结构已在脑中清晰时，可跳过 AI |

**产出文件**：`specs/001-contact-persistence/tasks.md`

tasks.md 的标准格式如下，后续 IDE 实现阶段按此执行：

```markdown
## Phase 1: Rust 数据层

- [ ] 1.1 定义 Contact struct（含 schema_version: u32）
  - 文件：src-tauri/src/contact.rs
- [ ] 1.2 实现 sanitize_filename 函数
  - 文件：src-tauri/src/contact.rs
- [ ] 1.3 实现 contact_save Tauri Command
  - 文件：src-tauri/src/lib.rs

## Phase 2: TypeScript 类型同步

- [ ] 2.1 更新 Contact 类型定义
  - 文件：src/lib/types.ts
...
```

---

### 阶段 6：代码实现（Implement）

**目标**：按 tasks.md 逐任务编写代码。**这是 IDE 工具的主场。**

| 工具选项 | 使用方式 | 适用场景 |
|---|---|---|
| **Cursor Chat** | 在 Composer 中 @tasks.md @spec.md，逐任务提问实现 | 首选，代码编辑能力最强 |
| **Cursor Agent 模式** | `/speckit-implement`（全自动执行所有任务） | 任务清晰且风险低时，可全量自动执行 |
| **Zed AI** | 打开 tasks.md，逐任务在 Zed 的 AI panel 中实现 | 偏好 Zed 编辑体验时 |
| **Windsurf** | 同 Cursor 使用方式 | 偏好 Windsurf 时 |
| **Claude Code CLI** | `/speckit.implement` | 不在 IDE 环境时使用 |

**Cursor Chat 推荐用法（逐任务模式）：**

```
# 在 Cursor Composer 中

@specs/001-contact-persistence/tasks.md
@specs/001-contact-persistence/spec.md
@.specify/memory/constitution.md

请实现 tasks.md 中的 Phase 1 第 1.1 和 1.2 任务：
在 src-tauri/src/contact.rs 中定义 Contact struct 和 sanitize_filename 函数。
遵守 constitution.md 中的架构约束。
```

**注意**：每完成一批任务后，在 tasks.md 中将对应条目标记为 `[x]`，保持进度可追踪。

---

### 阶段 7：实现校验（Verify）— 可选

**目标**：检验代码实现是否覆盖了 spec.md 中的所有验收标准，发现遗漏或偏差。

| 工具选项 | 调用方式 | 说明 |
|---|---|---|
| **Claude Code CLI**（安装 spec-kit-verify 扩展后） | `/speckit-verify` | 对照 spec.md 逐条验收 |
| **GPT-4o / o3（OpenRouter）** | 将 spec.md + 实现代码 diff 贴入，要求逐条验收 | 最灵活，可指定任意模型 |
| **Cursor Chat** | @spec.md + @相关代码文件，要求逐条核对验收标准 | 最低成本，无需安装扩展 |

**GPT 验收 Prompt 模板：**

```
以下是功能规格（spec.md）和对应的代码实现。
请逐条检查 spec.md 中"验收标准"章节的每一条是否已被实现，
对于未实现或存在偏差的条目，给出具体说明和建议修复方式。

【spec.md 内容】
[粘贴 spec.md]

【实现代码（git diff 或关键文件）】
[粘贴代码]
```

---

### 阶段 8：代码审查（Review）— 可选

**目标**：从代码质量、安全性、架构合规性角度对实现进行深度审查。

| 工具选项 | 调用方式 | 适用场景 |
|---|---|---|
| **GPT-4o / o3（OpenRouter）** | 贴入代码 + constitution.md，要求 staff-level review | 擅长严格审查、发现边界问题 |
| **Claude Code CLI**（安装 spec-kit-staff-review 扩展后） | `/speckit-staff-review` | 结构化审查报告 |
| **Claude Code CLI**（安装 spec-kit-review 扩展后） | `/speckit-review` | 轻量代码质量审查 |
| **Cursor Chat** | @代码文件，要求 code review | 快速局部审查 |

**GPT 代码审查 Prompt 模板：**

```
请以资深工程师视角，对以下 Rust + TypeScript 全栈代码进行审查。
项目架构约束见 constitution.md（已附）。

审查维度：
1. 架构合规性（是否违反 constitution.md 中的约束）
2. 错误处理是否完整（Rust 端 Err(String) 返回，前端正确处理）
3. 数据竞争和并发安全（Tauri Command 层）
4. 类型安全（TypeScript 严格模式）
5. 边界情况覆盖（文件名特殊字符、磁盘满、权限不足等）

【constitution.md】
[粘贴内容]

【待审查代码】
[粘贴代码]
```

---

## 完整工作流速查表

> Cursor 内的调用一律走 Agent 模式 + 自然语言点名 skill（见 §1.1 方式 A）；Claude Code 内才使用点号斜杠命令。

| 阶段 | Skill 名 | 推荐工具 | 备选工具 | 产出文件 |
|---|---|---|---|---|
| 治理原则 | `speckit-constitution` | **Cursor Agent** | Claude Code（`/speckit.constitution`） | `.specify/memory/constitution.md` |
| 功能规格 | `speckit-specify` | **Cursor Agent** | Claude Code / OpenRouter API | `specs/xxx/spec.md` |
| 需求澄清 | `speckit-clarify` | **Cursor Agent** | Claude Code / 手动编辑 | `spec.md`（更新） |
| 验收清单 | `speckit-checklist` | **Cursor Agent** | Claude Code | `specs/xxx/checklist.md` |
| 技术计划 | `speckit-plan` | **Cursor Agent** | Claude Code / DeepSeek API | `plan.md` + `data-model.md` |
| 一致性检查 | `speckit-analyze` | **Cursor Agent** | Claude Code / GPT 手动贴入 | 报告（无固定文件） |
| 任务拆解 | `speckit-tasks` | **Cursor Agent** | Claude Code | `tasks.md` |
| **代码实现** | `speckit-implement` | **Cursor Agent**（分 Phase 跑） | Claude Code / Zed / Windsurf | 代码文件 |
| 任务转 Issue | `speckit-taskstoissues` | **Cursor Agent** | Claude Code | GitHub Issues |
| 实现校验 | 扩展或手动 | **GPT-4o（OpenRouter）** | Cursor Agent / Claude Code | 校验报告 |
| 代码审查 | 扩展或手动 | **GPT-4o / o3（OpenRouter）** | Cursor Agent | 审查报告 |

---

## 工具调用方式汇总

### Claude Code CLI（命令行）

```bash
# 进入项目目录后启动 Claude Code
cd /path/to/Social-copilot
claude

# 然后使用 slash commands
/speckit.specify ...
/speckit.plan ...
/speckit.tasks
/speckit.implement
```

### Cursor Agent 模式（IDE）

> 详细方案见上文 §1。这里只放最短调用步骤。

1. 打开 Cursor 右侧 Chat / Composer，**右上角切到 Agent 模式**（必须是 Agent，不能是 Ask / Edit）。
2. 用自然语言点名 skill 即可，例如：

   ```
   请使用 speckit-specify skill 为我创建 Feature 规格：……
   ```

3. 当前仓库通过 `--integration claude` 安装，对应 skill 文件位于 `.claude/skills/speckit-*/SKILL.md`，
   Cursor 会自动加载为 Agent Skills，无需额外配置。
4. 需要强引用某个 SKILL 时可 `@.claude/skills/speckit-<name>/SKILL.md` + `@.specify/memory/constitution.md`。
5. Cursor 的 `/` 面板调出来的是 Cursor commands，不是 spec-kit skills——**spec-kit skill 用打字调用，不用斜杠**。

### OpenRouter / 纯 API 工具（Zed / ChatGPT / 自定义客户端）

当你想用特定模型（如 DeepSeek、Gemini、o3）完成某个阶段时：

1. 找到对应阶段的模板文件：
   - Specify → `.specify/templates/spec-template.md`
   - Plan → `.specify/templates/plan-template.md`
   - Tasks → `.specify/templates/tasks-template.md`
2. 将模板内容 + constitution.md + 当前 spec/plan（如有）作为 system prompt
3. 在任意 AI 工具中完成对话
4. 将输出保存到对应的 `specs/xxx/` 文件中
5. 继续下一阶段

---

## 阶段间交接检查清单

每个阶段开始前，确认上一阶段的交接物已就绪：

```
specify 开始前：
  [ ] constitution.md 存在且包含架构约束

clarify 开始前：
  [ ] spec.md 存在，用户故事已列出

plan 开始前：
  [ ] spec.md 中"验收标准"章节已完整填写
  [ ] clarify 阶段的模糊点已有答案

tasks 开始前：
  [ ] plan.md 存在
  [ ] data-model.md 存在（如涉及数据结构）
  [ ] analyze 无重大不一致（或已知并接受）

implement 开始前：
  [ ] tasks.md 存在，任务均有明确文件路径
  [ ] 本地开发环境可用（pnpm dev / tauri dev）

verify/review 开始前：
  [ ] tasks.md 中所有任务已标记 [x]
  [ ] pnpm lint / pnpm build / cargo check 通过
```

---

## 新功能开发标准流程（日常参考，Cursor 优先）

每次开发新功能时，**在 Cursor Agent 模式**下按顺序点名 skill；Claude Code CLI 等价路径放在右列备用。

| 步骤 | Cursor Agent 调用语 | 等价 Claude Code 命令 |
|---|---|---|
| 0. 选切片 | 打开 `.specify/memory/roadmap.md`，找下一个 `Backlog` 条目（如 `F001`），把其"范围 / 不含 / 前置依赖"复制为下一步输入 | 同左 |
| 1. 建 Feature 规格 | `请用 speckit-specify skill 创建 Feature：……（粘贴 F0XX 条目内容）` | `/speckit.specify ……` |
| 2. 澄清（可选） | `请用 speckit-clarify skill 对当前 spec 提问澄清` | `/speckit.clarify` |
| 3. 验收清单（可选） | `请用 speckit-checklist skill 生成验收清单` | `/speckit.checklist` |
| 4. 技术计划 | `请用 speckit-plan skill 生成 plan，技术栈约束如下：……` | `/speckit.plan ……` |
| 5. 一致性检查（推荐） | `请用 speckit-analyze skill 检查 spec/plan/constitution` | `/speckit.analyze` |
| 6. 任务拆解 | `请用 speckit-tasks skill 拆任务` | `/speckit.tasks` |
| 7. 实现（分 Phase） | `@specs/xxx/tasks.md` + `请用 speckit-implement skill 执行 Phase 1 全部任务` | `/speckit.implement` |
| 8. 校验/审查 | `请对照 spec.md 与 constitution.md，逐条验收 Phase 1 实现` | 同左或换 GPT |
| 9. 提交 | 自动 commit 钩子已开启，按提示回答即可 | 同左 |
| 10. 收尾 | feature 分支合并回 main 后，**手动**把 `.specify/memory/roadmap.md` 中对应条目 Status 改 `Done`，并把验收结论追加到文末"已完成（Done）"区块 | 同左 |

`specs/xxx/` 目录全程保留进 git，与代码一同审查；`roadmap.md` 的 Status 切换不影响 constitution 版本，直接 commit 即可。

---

## 关于 token 消耗的实用建议

| 阶段 | token 消耗级别 | 节省技巧 |
|---|---|---|
| constitution | 低（一次性） | 直接编辑 MD 文件，不用 AI |
| specify | 中 | 提供详细需求，减少 clarify 来回 |
| clarify | 低～中 | 只澄清真正模糊的点，已知答案直接写入 spec |
| plan | 高（最消耗） | 用 DeepSeek 替代 Claude，质量略降但成本低 4～10 倍 |
| tasks | 低 | 任务粒度清晰时可手动写 |
| implement | 按需 | Cursor Chat 逐任务，每次只加载相关文件的上下文 |
| verify | 低 | 只贴 spec 验收标准章节 + git diff，不贴全量代码 |
| review | 中 | 只贴改动的文件，不贴未变更的文件 |
