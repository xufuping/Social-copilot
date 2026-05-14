<!--
Sync Impact Report
==================
Version change: 1.0.0 → 1.0.1 (PATCH)
Bump rationale: 澄清式修订（PATCH）。本次未新增/删除/重定义任何原则或章节，仅做两处澄清：
  1) Principle IV 补强 AI 候选回复输出契约（Mock 与真实模型一致禁止携带调试/元信息标记）;
  2) Governance 引用新设的 `.specify/memory/roadmap.md` 作为路线图权威来源。
Modified principles:
  - Principle IV：末尾追加一条 bullet，明确"AI 候选回复输出 MUST 仅包含可直接发送的自然语言文本"。
Added sections: 无
Removed sections: 无
Templates requiring updates:
  - ✅ .specify/templates/*.md（无结构变化，无需改动）
  - ✅ .claude/skills/speckit-*/SKILL.md（无需改动）
  - ✅ Plan/specKitUsage.md（同步新增 §0.5 路线图使用方式与标准流程的第 0 步）
External references:
  - .specify/memory/roadmap.md（新建，作为长期 feature 切片索引；与本宪法平级但分属规划层面）

Earlier history
---------------
Version 1.0.0 (Ratified 2026-05-14):
  - 首次正式确立项目宪法（MAJOR 初值），将 `Plan/1.1.md` 的产品/技术边界提升为不可推翻的治理原则。
  - 模板占位符映射：
    [PRINCIPLE_1_NAME] → I. Tauri 桌面外壳与静态导出（NON-NEGOTIABLE）
    [PRINCIPLE_2_NAME] → II. AI 调用经 Tauri Rust Command 中转（NON-NEGOTIABLE）
    [PRINCIPLE_3_NAME] → III. 联系人为核心组织单位
    [PRINCIPLE_4_NAME] → IV. 手动粘贴主链路与候选条数语义化（NON-NEGOTIABLE）
    [PRINCIPLE_5_NAME] → V. 代码质量与质量门禁（NON-NEGOTIABLE）
  - 新增章节：技术栈与安全约束 / 开发工作流与质量门禁 / Governance。
-->

# Social Copilot Constitution

## Core Principles

### I. Tauri 桌面外壳与静态导出（NON-NEGOTIABLE）

项目 MUST 始终以 Tauri v2 + Rust 作为桌面外壳，前端 MUST 通过 Next.js 16 App Router 的
`output: 'export'` 静态导出，由 Tauri 加载 `out/`。

- 禁止引入 Next.js Server Actions、API Routes、ISR 作为桌面端 AI 主链路。
- 禁止依赖 Node.js 运行时服务（仅本地构建期工具链允许）。
- 不得新增需要长驻 Web Server 的模块作为产品主路径。

理由：当前发布形态是桌面应用，静态导出是与 Tauri 集成方式锁定的前提；引入服务端运行时会
破坏分发模式与离线可用性。

### II. AI 调用经 Tauri Rust Command 中转（NON-NEGOTIABLE）

所有模型请求、模型密钥、网络代理与错误归一化 MUST 集中在 Rust Command 层。

- 前端 MUST 通过 `invoke(...)` 触发，禁止从前端 bundle 直接调用第三方模型 HTTP 接口。
- API Key MUST 仅在 Rust 层的应用配置目录（如 `ai-provider.json`）读写，禁止进入前端打包产物、
  环境变量、日志或任何 git 跟踪文件。
- 网络代理兼容 MUST 在 Rust `reqwest`（或同等可控 HTTP 客户端）层解决，便于本地 Surge 等环境穿透。
- Rust Command MUST 以 `Result<T, String>` 返回可读错误字符串；禁止泄漏内部堆栈、文件路径或密钥。
- Provider Adapter、Prompt Builder、`contact.skill` 蒸馏等中间层能力优先落在 Rust Command 管线，
  前端只承载呈现与编辑。

理由：把密钥与网络出口收敛到唯一进程边界，是当前架构唯一能同时满足"无服务端 + 安全密钥 +
代理兼容"三个目标的实现路径。

### III. 联系人为核心组织单位

会话记录、属性定义、蒸馏 `skill`、后续 RAG 记忆 MUST 围绕"联系人"维度组织；AI 输出 MUST
持续受当前选中联系人画像约束。

- 任一 AI 请求的请求体 MUST 携带当前选中的 `WorkspaceContact` 画像（属性定义已包含原"关系/身份"
  类信息）。
- 工作台状态（草稿、候选回复、错误信息、回复条数偏好、style 展示模式）MUST 按联系人维度独立保留，
  切换联系人时恢复其上次内容。
- 新增能力（多模态、引用、记忆检索）SHOULD 优先按"挂在联系人下"的方式建模，禁止用全局单例
  绕过联系人维度。

理由：脱离联系人维度的 AI 输出会退化为一次性 Prompt 工具，无法形成长期可复用的画像资产。

### IV. 手动粘贴主链路与候选条数语义化（NON-NEGOTIABLE）

当前版本主输入链路 MUST 为"用户手动复制粘贴对方消息 + 用户预期"。

- 禁止以系统探针、OCR、剪贴板自动监听、聊天应用注入作为 MVP 主链路；上述能力即便实现，
  也只能作为补充入口，不得替代手动路径。
- 候选回复条数 MUST 在 3~10 之间由用户选择，默认 3；每次请求组装 Prompt 时 MUST 明确写出
  "请提供 n 条回复消息"（n 为该字段值）。
- 工作台 MUST 提供清晰的空态、加载态、失败态、禁用态；在 Mock 与真实模型两条链路下均可独立可用。
- 发送成功后 MUST 清空"联系人发送的内容"输入框，MUST 保留"我对本次交流的预期"以便连续微调。
- 新功能 MUST NOT 破坏手动复制粘贴主链路的稳定性。
- AI 候选回复输出 MUST 仅包含可直接发送的自然语言文本；Mock 与真实模型两条链路 MUST NOT 在
  `Suggestion.text` 中携带 `[Mock · 意图=…]`、`已知画像`、`debug_info` 等调试或元信息标记。
  画像约束仍可在请求侧 Prompt 中显式存在，但禁止污染用户可见文案。

理由：手动主链路是当前唯一已验证可稳定交付的产品价值路径；任何"自动读取/注入"特性都不应
让默认体验出现回归。把"对外文案不带元信息"提升为宪法级契约，确保即便切换 Provider 或调试
开关，用户看到的候选回复始终是可一键发送的成品对白。

### V. 代码质量与质量门禁（NON-NEGOTIABLE）

任何提交在合并前 MUST 通过以下门禁：

- `pnpm lint` 通过；TypeScript 严格模式启用，禁止使用 `@ts-ignore` 抑制可修复的类型错误。
- `pnpm build`（Next.js 静态导出）通过。
- 涉及 Rust 端变更时，`cargo check`（或 `cargo build`）通过。
- 组件 SHOULD 单一职责；跨端共享数据契约 MUST 在 TypeScript / Rust 两端保持字段一致（`camelCase`
  序列化）。
- Rust Command 层 MUST 统一处理错误并以可读字符串返回；前端 MUST 将其写入对应联系人工作台的
  `error`，不丢失用户输入。

理由：桌面应用一旦发布即难以回滚，门禁是把"原则可落地"转换为"能跑的二进制"的最低要求。

## 技术栈与安全约束（Tech Stack & Security Constraints）

以下边界与 Core Principles 互补，凡修改 MUST 走 Governance 中的修订流程：

- **桌面外壳**：Tauri v2 + Rust。
- **前端视图层**：Next.js 16 App Router + React 19 + TypeScript。
- **样式与组件**：TailwindCSS v4 + Shadcn UI + lucide-react。
- **包管理**：pnpm。
- **构建模式**：`output: 'export'` 静态导出，由 Tauri 加载 `out/`。
- **当前数据来源**：本地文件系统（阶段三起按联系人维度的 `[contact_name].json` 持久化）；当前阶段
  不引入 SQLite 或其他数据库依赖。
- **跨端数据契约**：`AiSuggestionRequest`、`Suggestion`、`WorkspaceContact` 等 MUST 在
  `src/lib/types.ts` 与 Rust struct 之间保持字段一致（`camelCase` 序列化）。
- **AI 配置**：`ai-provider.json`（`baseUrl` / `apiKey` / 模型名）MUST 由 Rust 层 `get_ai_config` /
  `save_ai_config` 读写；前端 MUST NOT 直接读取磁盘或 API Key。
- **窗口形态**：无边框 / 始终置顶可切换 / 侧边栏尺寸 / 自绘拖拽条与窗口控制按钮；浏览器开发模式
  下 MUST 对 Tauri 专属 API 做安全降级。
- **明确不采用**：Python / PyQt6 / LangChain-Python 旧栈；浏览器端直持 API Key 的直连方案；
  Next.js Server Actions / API Routes / ISR 作为桌面端 AI 主链路。

## 开发工作流与质量门禁（Development Workflow & Quality Gates）

1. **规格驱动**：新功能 MUST 从 `/speckit-specify` 开始进入 spec-kit 流水线，不再直接修改
   `Plan/1.1.md`；`Plan/1.1.md` 与 `Plan/ui.md` 转为历史规划只读参考，UI 细节迁入对应 feature 的
   `spec.md`。
2. **流水线顺序**：`constitution → specify → clarify（可选）→ plan → analyze（可选，推荐）→
   tasks → implement → verify / review（可选）`。每个阶段 MUST 在 `specs/[###-feature]/` 内留下
   可追溯的文本产物。
3. **Plan 阶段宪法门禁**：`plan.md` 的 `Constitution Check` 章节 MUST 显式回答本宪法五条原则
   是否满足；如存在偏离 MUST 在 `Complexity Tracking` 中记录"违例 + 必要性 + 拒绝更简方案的理由"。
4. **任务粒度**：`tasks.md` 中每条任务 MUST 指明具体文件路径，按用户故事分组以便独立验证。
5. **AI 请求约束**：实现 AI 链路时，Prompt MUST 显式包含"请提供 n 条回复消息"；请求体字段
   命名与 `Plan/1.1.md §2.4` 等价描述保持一致或在 spec 中明示偏差。
6. **审查覆盖面**：每次审查 MUST 包含：架构合规性（对照本宪法）、错误处理完整性、跨端数据契约
   一致性、边界情况（文件名特殊字符、磁盘空间、权限、网络代理）。
7. **历史规划处理**：`Plan/1.1.md`、`Plan/ui.md` 保留只读；它们的宏观规划用于指导 `specs/` 中
   功能的优先级与边界，但不再作为 AI 执行的唯一权威依据。
8. **日常调用指南**：见 `Plan/specKitUsage.md`；初次接入手册见 `Plan/importSpecKit.md`（接入完成后
   作为历史存档）。

## Governance

- 本宪法效力高于其他实践与历史文档（含 `Plan/1.1.md`）。当任意 spec / plan / tasks / 代码与本宪法
  冲突时，MUST 修正后者或走本节修订流程。
- **修订流程**：任何修改 MUST 通过一次显式的 `/speckit-constitution` 调用完成，同时在文件顶部
  Sync Impact Report 中记录版本变更、修改/新增/移除项与受影响模板。
- **语义化版本策略**：
  - **MAJOR**：移除或重新定义任一 NON-NEGOTIABLE 原则；改变锁定的桌面架构（如重新启用
    Server Actions、引入第二种密钥存储位置）。
  - **MINOR**：新增原则 / 章节，或对现有原则做实质性扩展（如新增"可观测性"原则）。
  - **PATCH**：澄清措辞、修正笔误、非语义级精修。
- **合规审查**：所有 PR / 代码审查 MUST 验证本宪法合规；`plan.md` 的 `Constitution Check` 与
  `Complexity Tracking` 是默认审查入口。
- **复杂度证明义务**：任何引入新依赖、新进程边界、新数据存储形态的提案 MUST 在对应 `plan.md`
  或 `spec.md` 中证明"为什么更简方案不够"。
- **运行时指引**：当前运行时上下文（技术栈、脚本、目录结构）以根目录 `CLAUDE.md` 与
  `Plan/specKitUsage.md` 中"工作流速查表"为准。
- **路线图来源**：项目长期待办的大任务（feature 切片）以 `.specify/memory/roadmap.md` 为
  权威索引；每个条目的 `Status: Backlog | InProgress | Done | Deferred | Dropped` 表示当前
  推进状态。Roadmap 改动属于规划层面变更，**不影响宪法版本**；新功能开工前 MUST 先在 roadmap
  确认对应 `F0XX` 条目存在且处于 `Backlog`，再走 `speckit-specify` 流水线。

**Version**: 1.0.1 | **Ratified**: 2026-05-14 | **Last Amended**: 2026-05-14
