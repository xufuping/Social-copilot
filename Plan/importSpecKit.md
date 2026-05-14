# Social Copilot × Spec-Kit 接入方案

> **文档定位**：本文是将当前 Social Copilot 项目（Brownfield）接入 spec-kit 规格驱动开发的一次性操作手册。
> 执行完成后，本文作为历史存档，后续日常开发请参考 `Plan/specKitUsage.md`。

---

## 前置条件检查

在开始之前，确认以下工具已安装：

```bash
# 检查 Python 版本（需要 3.11+）
python3 --version

# 检查 uv（推荐的包管理器）
uv --version
# 若未安装 uv：
brew install uv

# 检查 git
git --version
```

---

## 第一步：安装 specify CLI

```bash
# 1. 查看最新稳定版本 tag：https://github.com/github/spec-kit/releases
# 2. 替换下方 vX.Y.Z 为实际最新 tag，例如 v0.4.4

uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@vX.Y.Z

# 验证安装
specify version

# 查看支持的 integration 列表
specify integration list
```

---

## 第二步：在当前项目初始化（Brownfield 模式）

```bash
cd /path/to/Social-copilot

# --here 表示在当前目录初始化，不新建子目录
# --force 表示允许在已有文件的目录中合并
# --integration cursor 生成 Cursor IDE 所需的 skill 文件

specify init --here --force --integration cursor

# 如果同时使用 Claude Code CLI，可追加第二个 integration：
# specify init --here --force --integration cursor
# 然后再运行：
# specify init --here --force --integration claude --ignore-agent-tools
```

执行后，项目根目录会新增以下结构：

```text
Social-copilot/
├── .specify/
│   ├── memory/
│   │   └── constitution.md        ← 项目治理原则（待填充）
│   ├── scripts/
│   │   ├── check-prerequisites.sh
│   │   ├── create-new-feature.sh
│   │   └── ...
│   └── templates/
│       ├── spec-template.md
│       ├── plan-template.md
│       └── tasks-template.md
├── .cursor/
│   └── skills/                    ← Cursor Agent 可调用的 speckit-* skills
│       ├── speckit-constitution.md
│       ├── speckit-specify.md
│       ├── speckit-plan.md
│       ├── speckit-tasks.md
│       └── speckit-implement.md
└── specs/                         ← 每个功能 Feature 的规格目录（后续生成）
```

> **注意**：`specs/` 目录会在第一次运行 `/speckit.specify` 时自动创建。`.specify/` 和 `.cursor/skills/` 应提交到 git。

---

## 第三步：将现有规划迁移为 Constitution

当前项目已有高质量规划文档（`Plan/1.1.md`），需要将其核心内容转化为 spec-kit 的 `constitution.md`。

**在 Claude Code 中执行：**

```
/speckit.constitution

参考以下已有规划文档，为 Social Copilot 项目创建治理原则：

【技术架构约束（锁定，不可推翻）】
- 桌面外壳：Tauri v2 + Rust；AI 调用统一通过 Tauri Rust Command 中转，不走 Next.js API Routes
- 前端：Next.js 16 App Router + React 19 + TypeScript + TailwindCSS v4 + Shadcn UI
- 包管理：pnpm；构建：Next.js output: 'export' 静态导出，由 Tauri 加载 out/
- API Key 只在 Rust 层（应用配置目录 ai-provider.json）读写，绝不进入前端 bundle
- 网络代理兼容在 Rust reqwest 层解决

【产品核心约束】
- 联系人是核心组织单位，所有 AI 输出受联系人画像约束
- 当前版本不采用系统探针/OCR/剪贴板监听自动读取外站聊天，主链路为手动复制粘贴
- 候选回复条数 3～10，默认 3，每次请求须在 Prompt 中明确写出"请提供 n 条回复消息"

【代码质量原则】
- TypeScript 严格模式，组件职责单一
- Rust Command 层统一处理错误并返回可读错误字符串，不暴露内部堆栈
- 新功能不破坏手动粘贴主链路的稳定性
- pnpm lint / pnpm build / cargo check 必须在提交前通过
```

执行后检查 `.specify/memory/constitution.md` 内容是否符合预期，可直接编辑补充。

---

## 第四步：将现有规划转化为当前 Feature Spec

当前项目正处于**阶段三**（联系人画像与本地持久化）开发前，以此为第一个 spec-kit Feature。

**在 Claude Code 中执行：**

```
/speckit.specify

基于 Plan/1.1.md 的「阶段三：contact.skill 正式化与本地持久化」，为 Social Copilot 创建 Feature 规格：

功能名称：contact-persistence（联系人画像本地持久化）

核心需求：
1. 联系人数据结构正式化：包含 name、attribute_definition、manual_tags、distilled_skill、notes、updated_at、skill_file_error 字段
2. 在 Tauri 应用专属目录下，按联系人维度读写 JSON 文件（[contact_name].json）
3. 处理非法文件名、重名联系人、Schema 版本升级
4. 重启应用后可恢复全部联系人资料
5. AI 生成链路接入本地联系人画像数据（不再使用 Mock 预置数据）
6. 为后续 RAG 记忆演进预留结构：distilled_skill 与检索记忆可并存

约束：
- 所有文件读写通过 Tauri Rust Command，前端不直接操作文件系统
- 数据契约需前后端（TypeScript / Rust）共享类型定义
```

---

## 第五步：澄清与细化（可选但推荐）

```
/speckit.clarify
```

让 AI 就 spec 中模糊的地方提问，常见需要澄清的点：

- 联系人重名时的处理策略（追加序号？报错？覆盖？）
- Schema 版本升级的迁移策略（自动迁移？提示用户？）
- 联系人名称含特殊字符时文件名的处理规则

---

## 第六步：生成技术实现计划

```
/speckit.plan

技术栈约束：
- Rust 端：使用 Tauri 的 app_data_dir() 获取应用目录，用 serde_json 读写 JSON
- TypeScript 端：联系人类型定义与 Rust struct 保持字段一致（camelCase 序列化）
- 不引入新的数据库依赖，当前阶段纯文件系统
- Schema 版本字段命名为 schema_version，初始值为 1
```

---

## 第七步：生成任务清单

```
/speckit.tasks
```

这会在 `specs/001-contact-persistence/tasks.md` 中生成带依赖关系的任务清单，例如：

```text
[ ] 1. 定义 Rust 端 Contact struct（含 schema_version）
[ ] 2. 实现 contact_save Tauri Command
[ ] 3. 实现 contact_load_all Tauri Command
[ ] 4. 处理文件名 sanitize 逻辑
[ ] 5. 更新前端 TypeScript 类型定义
[ ] 6. 迁移前端联系人状态到持久化读写
[ ] 7. 接入持久化联系人到 AI 请求构造
[ ] 8. 编写基础 Rust 单元测试
```

---

## 第八步：可选扩展安装

根据需要安装社区扩展：

```bash
# 代码实现完成后的质量审查
specify extension add spec-kit-staff-review

# 检验实现是否覆盖 spec 中的所有验收标准
specify extension add spec-kit-verify

# 检测 spec 与实现之间的漂移
specify extension add spec-kit-sync

# 跨模型审查（用于三阶段分工工作流）
specify extension add multi-model-review

# 若需要将任务同步到 GitHub Issues
specify extension add spec-kit-github-issues
```

---

## 执行后的目录结构

完成上述步骤后，项目目录将如下所示：

```text
Social-copilot/
├── Plan/
│   ├── 1.1.md              ← 原有规划文档（保留作历史参考）
│   ├── ui.md               ← 原有 UI 规格文档（保留作历史参考）
│   ├── importSpecKit.md    ← 本文（接入手册）
│   └── specKitUsage.md     ← 日常使用指南
├── .specify/
│   ├── memory/
│   │   └── constitution.md ← 项目治理原则（已填充）
│   ├── scripts/
│   └── templates/
├── specs/
│   └── 001-contact-persistence/
│       ├── spec.md         ← Feature 功能规格
│       ├── plan.md         ← 技术实现计划
│       ├── research.md     ← 技术调研
│       ├── data-model.md   ← 数据模型
│       └── tasks.md        ← 任务清单（实现驱动）
└── .cursor/
    └── skills/             ← Cursor Agent skills
```

---

## 与现有 Plan/ 文档的关系

| 文件 | 角色 | 后续处理 |
|---|---|---|
| `Plan/1.1.md` | 历史规划文档 | 保留只读，不再直接作为 AI 执行依据 |
| `Plan/ui.md` | UI 规格文档 | 保留只读；UI 相关需求迁入对应 feature 的 `spec.md` |
| `.specify/memory/constitution.md` | **新的项目治理原则** | 所有 AI 执行前强制读取 |
| `specs/xxx/spec.md` | **新的功能规格** | AI 实现的唯一权威依据 |

> 后续新功能开发从 `/speckit.specify` 开始，不再更新 `Plan/1.1.md`。

---

## 常见问题

**Q：`specify init` 时提示找不到 Cursor CLI？**
加上 `--ignore-agent-tools` 跳过工具检查：
```bash
specify init --here --force --integration cursor --ignore-agent-tools
```

**Q：`.cursor/skills/` 目录中的 skill 如何在 Cursor 中使用？**
在 Cursor Agent 模式下（Composer 中切换到 Agent），输入 `/speckit-specify`（注意是连字符，不是点）即可触发对应 skill。

**Q：已有代码的项目要不要补历史 Feature 的 spec？**
不强制。对于已完成的阶段一/二，建议只建一个简短的 `000-baseline` spec 描述已完成的基线状态，无需详细任务拆解。

**Q：`specs/` 目录和 `Plan/` 目录如何共存？**
两者语义不同：`Plan/` 是人工维护的产品规划；`specs/` 是 AI 可执行的功能规格。保持并存，`Plan/` 的宏观规划指导 `specs/` 中功能的优先级和边界。
