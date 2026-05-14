# Social Copilot Roadmap

> **文档定位**：项目长期待办的大任务（feature 切片）索引。
> **权威性**：本文与 `.specify/memory/constitution.md` 平级，是 AI 在 spec-kit 流水线中的长期记忆；
> 但 **roadmap 改动属于规划层面变更，不影响 constitution 版本**（详见宪法 Governance）。
>
> **源头规划**：`Plan/1.1.md`（产品/技术规划散文版，保留作历史只读）。
> **本文角色**：把 `Plan/1.1.md` 散文式叙述切成 AI 友好的 feature 条目，便于 spec-kit 流水线消费。
>
> **如何使用**：每次准备开新 feature 前，先在本文找到下一个 `Backlog` 条目，把其 **范围 / 不含 / 前置依赖** 作为
> `speckit-specify` skill 的输入参数。开工后把 Status 改为 `InProgress`；feature merge 进 main 后改 `Done`。

---

## 状态机

| Status | 含义 |
|---|---|
| `Backlog` | 已纳入路线图，尚未开工；**禁止**对其调用 `speckit-plan` / `speckit-tasks` / `speckit-implement` |
| `InProgress` | `speckit-specify` 已落地 `specs/00N-xxx/spec.md`，正在推进流水线 |
| `Done` | 对应 feature 分支已合并回 main，且 `pnpm lint / build / cargo check` 通过 |
| `Deferred` | 主动延后；保留条目以便将来恢复 |
| `Dropped` | 不再做；保留条目作历史 |

---

## 切片总览

| ID | 名称 | 优先级 | 状态 | 源头 | 前置依赖 |
|---|---|---|---|---|---|
| F001 | contact-persistence | P1 | Backlog | Plan/1.1.md §3.1 + §3.2 | 无 |
| F002 | contact-rag-memory | P2 | Backlog | Plan/1.1.md §3.3 | F001 |
| F003 | engineering-hardening | P2 | Backlog | Plan/1.1.md §5.1 + §5.2 | F001 |
| F004 | rich-input-references | P3 | Backlog | Plan/1.1.md §4.1 + §4.2 | F001、F003 |
| F005 | voice-input | P4 | Backlog | Plan/1.1.md §4.3 | F004 |
| F006 | macos-release-pipeline | P4 | Backlog | Plan/1.1.md §5.3 | F001、F003 |

> 优先级排序原则：先把"数据可恢复 + 工程基线稳"做扎实（P1/P2），再扩输入多模态（P3/P4），最后做发布收口（P4）。
> 与 `Plan/1.1.md` "当前建议的下一步执行顺序"对齐：F001 → (F002 / F003 并行) → F004 → F005 → F006。

---

## F001 contact-persistence — 联系人画像本地持久化

- **优先级**：P1（当前首要）
- **状态**：Backlog
- **源头**：Plan/1.1.md §3.1 + §3.2
- **前置依赖**：无
- **范围（What）**：
  1. 联系人数据结构正式化：`name` / `attribute_definition` / `manual_tags` / `distilled_skill` /
     `notes` / `updated_at` / `skill_file_error` / `schema_version`（初值 1）
  2. 在 Tauri `app_data_dir()` 下按联系人维度读写 `[sanitized_name].json`
  3. 处理非法文件名（含特殊字符的 sanitize 规则）
  4. 处理重名联系人（追加序号 / 报错 / 覆盖 三选一，留作 clarify 决策点）
  5. Schema 版本字段预留升级路径（**当前期不实现自动迁移**，仅留接口）
  6. 重启应用后可恢复全部联系人资料
  7. AI 生成链路接入持久化后的本地画像数据（不再使用 Mock 预置）
- **不含**：
  - §3.3 RAG 记忆检索（拆到 F002）
  - 联系人头像、富文本备注等扩展字段
- **落地命令**（在 Cursor Agent 中输入）：
  ```
  请使用 speckit-specify skill 创建 F001 contact-persistence Feature，
  范围与不含项见 .specify/memory/roadmap.md F001 章节，
  须遵守 .specify/memory/constitution.md 全部 NON-NEGOTIABLE 原则。
  ```
- **预计验收**：重启应用后联系人完整恢复；AI 请求体中 `contact` 字段来源为本地持久化数据。

---

## F002 contact-rag-memory — 联系人 RAG 记忆演进

- **优先级**：P2
- **状态**：Backlog
- **源头**：Plan/1.1.md §3.3
- **前置依赖**：F001 完成（必须先有持久化的画像数据）
- **范围（What）**：
  1. 把属性定义、会话摘要、关键事实拆分为可检索记忆单元
  2. AI 请求前按当前联系人注入最相关记忆，而不是一次性塞入全部历史
  3. `distilled_skill` 与检索记忆并存（不互相替代）
  4. 评估嵌入/检索方案（本地向量库 vs 关键词检索；本期可先做关键词路径）
- **不含**：
  - 跨联系人的全局记忆库（不在 v1 范围）
  - 长期对话 RAG（聚焦联系人级，不是对话级）
- **架构关注点**：可能引入新依赖（向量库或检索引擎）——届时需在 `plan.md` 中证明"为何更简方案不够"（Constitution Governance 复杂度证明义务）。

---

## F003 engineering-hardening — 工程化与可观测性

- **优先级**：P2
- **状态**：Backlog
- **源头**：Plan/1.1.md §5.1 + §5.2
- **前置依赖**：F001 完成（持久化稳定后再做工程加固）
- **范围（What）**：
  1. 前端与 Rust Command 增加更明确的错误边界（错误码 / 类型边界）
  2. 关键模块的类型约束与基础测试（Rust 单元测试 + TS 类型测试）
  3. 区分开发模式与生产模式日志级别
  4. 补充"未选择联系人 / 未连接模型 / 输入中 / AI 请求中 / AI 失败 / 已生成建议"的状态反馈
  5. 加载骨架、空态、失败态、禁用态的回归
- **不含**：
  - macOS 打包签名（拆到 F006）
  - 性能 profiling / 监控告警（v1 不做）

---

## F004 rich-input-references — 链接与引用输入扩展

- **优先级**：P3
- **状态**：Backlog
- **源头**：Plan/1.1.md §4.1 + §4.2
- **前置依赖**：F001（数据契约稳定）、F003（错误边界与状态反馈稳定）
- **范围（What）**：
  1. 落地"链接""引用"两个入口的交互定义（输入区右下角已预留）
  2. 链接入口优先支持：企业微信 / 飞书 / 其他目标聊天应用 URL 解析
  3. 引用入口优先支持：图片、文件、表情包
  4. 为文本 + 图片 + 文件 + 引用项设计统一的数据描述结构（扩展 `AiSuggestionRequest`）
  5. 在 UI 中提供预览、删除、替换基础操作
- **不含**：
  - 语音输入（拆到 F005）
  - 自动从目标聊天应用抓取消息（违反 Constitution Principle IV 的手动主链路约束）
- **架构关注点**：MUST 保持手动复制粘贴主链路稳定（Constitution Principle IV 不可破坏）。

---

## F005 voice-input — 语音输入

- **优先级**：P4
- **状态**：Backlog
- **源头**：Plan/1.1.md §4.3
- **前置依赖**：F004 完成（富输入结构已就绪）
- **范围（What）**：
  1. 底部语音按钮从禁用态升级为可用功能
  2. 评估方案：本地 STT vs 调用云端 STT 服务（涉及隐私 / 网络 / 延迟 trade-off）
  3. 语音转文本结果接入"联系人发送的内容"或"我对本次交流的预期"两个输入框
- **不含**：
  - 实时语音对话 / 多轮语音交互
  - 语音情绪识别等高级 NLP 能力

---

## F006 macos-release-pipeline — macOS 打包与分发

- **优先级**：P4
- **状态**：Backlog
- **源头**：Plan/1.1.md §5.3
- **前置依赖**：F001、F003 完成（数据与工程基线稳定后再做发布）
- **范围（What）**：
  1. 验证 macOS 打包链路（`tauri build` 全流程）
  2. 校验 Tauri capability、签名、权限提示文案
  3. 准备最小可运行内测版本（Apple Developer 签名 + notarization）
  4. README / 启动说明同步更新
- **不含**：
  - Windows / Linux 打包（v1 不做）
  - 自动更新通道（评估后再决定是否单独建 feature）

---

## 已完成（Done）

> 当前为空。F001 完成后将以"feature 编号 - 名称 - 合并时间 - 验收结论"格式追加。

---

## 路线图维护规则

1. **优先级与状态变更**：直接编辑本文即可；不需要 `speckit-constitution` skill。
2. **新增 feature**：在「切片总览」表与对应详细章节同步追加，分配 `F0XX` 编号（顺延，不重用已 Dropped 的编号）。
3. **拆分 feature**：原条目改 `Status: Dropped`（说明拆分原因 + 指向新 ID），新增条目继承前置依赖。
4. **路线图与 `Plan/1.1.md` 出现矛盾**：以本文为准；`Plan/1.1.md` 是历史规划散文，本文是当前活动路线图。
5. **不要在 roadmap 中详细写需求细节**：详细需求属于 `specs/00N-xxx/spec.md`。本文每条 feature 控制在 ≤ 30 行。
