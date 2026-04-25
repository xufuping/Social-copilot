# Social Copilot
 
> 一个“静静待在侧边栏”的社交辅助驾驶桌面应用。
> 当前阶段：**已完成阶段一基础外壳与 UI 骨架，下一步进入阶段二 AI 中转闭环**。
 
---

## 规划基线
 
- **当前版本规划**：`Plan/1.1.md`
- 如后续出现新版本 Plan，应始终以最新版本为准
 

---

## 技术栈

| 层次 | 选型 |
| --- | --- |
| 外壳 / 系统层 | **Tauri v2**（Rust） |
| 前端视图 | **Next.js 16 (App Router)** + **React 19** + **TypeScript** |
| 样式 / UI | **TailwindCSS v4** + **Shadcn UI** (`base-nova` style, neutral base) + **lucide-react** |
| 包管理 | **pnpm** |
| AI 主链路（阶段二） | **Tauri Rust Command 中转** + **OpenAI-compatible provider**（待接入） |

Next.js 使用 **静态导出模式**（`output: 'export'`）产出 `out/` 供 Tauri 加载。
这意味着 **Server Actions / API Routes / ISR 不可用**。
当前已确定的技术路线是：**前端负责 UI 与交互，AI、系统能力、持久化能力统一优先通过 Tauri Rust Command 暴露**。

## 产品目标

- **手动触发获取建议**
  - 保持“获取 AI 建议”按钮式交互，不恢复 Ghost Text 实时渲染。

- **围绕聊天对象画像生成建议**
  - 产品核心资产是 `contact.skill`，AI 输出持续受聊天对象画像约束。

- **先保证桌面外壳稳定可用**
  - 侧边栏窗口需要可拖拽、最小化、关闭、切换置顶，并在异常情况下提供明确降级反馈。

## 目录结构

```
.
├── src/                        # Next.js 源码
│   ├── app/                    # App Router 入口
│   │   ├── layout.tsx          # 根布局（全屏锁定、主题注入）
│   │   ├── page.tsx            # 阶段一主视图（组合所有侧边栏组件）
│   │   └── globals.css         # Tailwind + Shadcn 主题变量
│   ├── components/
│   │   ├── ui/                 # Shadcn 生成的基础组件
│   │   ├── window-drag-bar.tsx # 无边框窗口顶部拖拽条 + 置顶/最小化/关闭
│   │   ├── target-status-bar.tsx
│   │   ├── profile-panel.tsx   # 画像标签增删
│   │   ├── intent-selector.tsx # 意图下拉 + 自定义
│   │   └── suggestion-panel.tsx# 获取建议按钮 + 候选卡片 + 一键复制
│   └── lib/
│       ├── types.ts            # Contact / ContactSkill / Intent / Suggestion
│       ├── mock.ts             # 阶段一 Mock 数据与模拟生成函数
│       ├── tauri-window.ts     # Tauri 窗口 API 的浏览器安全包装
│       └── utils.ts            # Shadcn 的 cn()
├── src-tauri/                  # Rust 外壳
│   ├── src/                    # main.rs / lib.rs
│   ├── capabilities/           # Tauri capability 权限配置
│   ├── tauri.conf.json         # 窗口配置（无边框 / 置顶 / 380x820）
│   └── Cargo.toml
├── Plan/1.1.md                 # 当前唯一的权威规划文档
├── next.config.ts
├── components.json             # Shadcn 配置
├── tsconfig.json
└── package.json
```

## 开发与构建

### 1. 纯前端开发（浏览器，最快迭代）

```bash
pnpm dev
# 访问 http://localhost:3000
# Tauri 专属 API（窗口控制）会自动降级为 no-op，不会报错
```

### 2. 真实 Tauri 窗口（看无边框 / 置顶效果）

```bash
pnpm tauri:dev
# 首次会编译 Rust，耗时较长；之后是增量编译
```

### 3. 静态导出产物自检

```bash
pnpm build          # 输出 out/
pnpm lint
```

### 4. 打包 macOS 安装包

```bash
pnpm tauri:build
# 产物位于 src-tauri/target/release/bundle/
```

## 当前基线 ✅

- [x] 移除全部 Python 代码（`brain/`、`distiller/`、`hook/`、`main.py` 等）
- [x] Tauri v2 + Next.js 16 骨架（静态导出、pnpm、TS、App Router）
- [x] Tauri 窗口：无边框、始终置顶、380×820 侧边栏尺寸
- [x] Shadcn UI（`base-nova` / neutral）+ lucide 图标
- [x] Target 状态栏（Mock "张总"，含"未捕获"降级态）
- [x] Target 画像面板（标签增 / 删 / 空态）
- [x] 意图选择器（3 个预置 + 自定义 / 删除自定义）
- [x] 建议卡片面板（按钮 / loading 骨架 / 3 张卡片 / 一键复制）
- [x] 自绘窗口控制（最小化、关闭、置顶切换，在浏览器端降级为 no-op）
- [x] Tauri capability 权限补齐（拖拽、最小化、关闭、置顶）
- [x] `pnpm build` 静态导出通过，`pnpm lint` 无告警

## 下一步

下一阶段的最小闭环目标是：

1. **实现 Rust AI Command**
   - 在 `src-tauri` 中新增如 `generate_suggestions` 的 Command。

2. **前端接入真实调用链路**
   - 将 `SuggestionPanel` 从本地 Mock 建议生成切换为 `invoke(...)` 调用。

3. **正式化 `contact.skill` 数据契约**
   - 明确 `manual_tags`、`distilled_traits`、摘要、更新时间等字段。

4. **接入单一 OpenAI-compatible provider**
   - 优先跑通最小闭环，再逐步补全代理、蒸馏与中间件能力。

## 后续路线

- **阶段二**：AI 中转层与 `contact.skill` 管线落地
- **阶段三**：macOS 系统探针与真实聊天上下文捕获
- **阶段四**：本地画像持久化
- **阶段五**：工程化、可观测性与发布前收口
