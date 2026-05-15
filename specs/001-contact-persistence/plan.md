# Implementation Plan: F001 Contact Persistence

**Branch**: `001-contact-persistence` | **Date**: 2026-05-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-contact-persistence/spec.md`

## Summary

将联系人画像数据从前端内存 Mock 升级为 Tauri `app_data_dir()` 下的 JSON 文件持久化。核心交付：
1. Rust 端新增 `ContactFileData` struct + 4 个 Tauri Command（加载全部联系人、保存单个联系人、删除联系人、sanitize 文件名）
2. 前端启动时从 Rust 侧加载联系人列表，替换 `INITIAL_CONTACTS` 硬编码数据
3. 新建联系人 / 编辑画像字段时触发 Rust Command 写盘
4. AI 请求体中 `contact` 字段始终来自本地持久化数据（当前已满足，因为 `WorkspaceContact` 直接传入，本 feature 确保其来源变为持久化数据）
5. TypeScript 类型做最小化调整（添加 `schemaVersion?` 为可选字段），主映射逻辑在 Rust 层

## Technical Context

**Language/Version**: TypeScript（Next.js 16 App Router, React 19）+ Rust（Tauri v2）

**Primary Dependencies**:
- 前端：React 19, Next.js 16, `@tauri-apps/api` (invoke), TailwindCSS v4, Shadcn UI
- Rust：`tauri` v2, `serde` + `serde_json`, `std::fs`, `tauri::Manager` (app_data_dir)
- 无需引入新的 Cargo 依赖

**Storage**: Tauri `app_data_dir()` 下的 `contacts/[sanitized_name].json`（每个联系人一个文件）

**Testing**: `cargo check` / `pnpm lint` / `pnpm build`（无新增测试框架需求，Rust 核心函数可添加 `#[cfg(test)]` 单元测试）

**Target Platform**: macOS 桌面端（Tauri v2），`pnpm dev` 纯浏览器模式下 invoke 路径自动降级

**Project Type**: 桌面应用（Tauri + Next.js 静态导出）

**Performance Goals**: 联系人列表 ≤ 数百个；全量加载一次性完成，无需分页

**Constraints**:
- 宪法 Principle II：所有文件 I/O MUST 经 Rust Command 层，前端不得直接操作文件系统
- 宪法 Principle V：`pnpm lint` + `pnpm build` + `cargo check` 必须全部通过
- `schema_version` 初值为 `1`；本期不实现自动迁移，仅读取时检测版本号

**Scale/Scope**: 单文件变更影响 `src-tauri/src/lib.rs`（+新 Commands）+ `src/app/page.tsx`（加载逻辑）+ `src/lib/types.ts`（最小改动）；不触碰 UI 组件层

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 描述 | 状态 | 说明 |
|------|------|------|------|
| **I. Tauri 桌面外壳** | 文件 I/O 通过 Tauri `app_data_dir()` 在 Rust 层执行 | ✅ PASS | 不引入 Server Actions / API Routes / Node.js 运行时 |
| **II. AI 调用经 Rust Command 中转** | 持久化读写通过新增 Rust Commands；AI 请求链路不变 | ✅ PASS | `contact` 字段来源从 Mock 改为持久化数据，但 invoke 路径不变 |
| **III. 联系人为核心组织单位** | 每个联系人独立一个 `[sanitized_name].json`；按联系人维度组织 | ✅ PASS | 完全对齐 |
| **IV. 手动粘贴主链路** | 本 feature 只涉及数据持久化层，不修改输入链路 | ✅ PASS | 手动粘贴主链路不受影响 |
| **V. 代码质量门禁** | 新增 Rust Commands 需通过 `cargo check`；TypeScript 改动需通过 `pnpm lint` + `pnpm build` | ✅ PASS（待实现后验证） | 无新依赖；TypeScript 严格模式保持 |

**Constitution Check 结论**：全部通过，无 Complexity Tracking 记录义务。

## Project Structure

### Documentation (this feature)

```text
specs/001-contact-persistence/
├── plan.md              ← 本文件
├── research.md          ← Phase 0 输出
├── data-model.md        ← Phase 1 输出
├── quickstart.md        ← Phase 1 输出
├── contracts/           ← Phase 1 输出
│   └── tauri-commands.md
└── tasks.md             ← Phase 2 输出（由 /speckit-tasks 生成，不在本命令创建）
```

### Source Code (repository root)

本 feature 采用"单项目 Tauri Desktop App"结构，改动限定在以下路径：

```text
src-tauri/src/
└── lib.rs               ← 新增 ContactFileData struct + 4 个 Tauri Commands
                            + sanitize_filename / resolve_contact_path 工具函数
                            + 文件 I/O 单元测试（#[cfg(test)]）

src/
├── lib/
│   ├── types.ts         ← 最小化修改（WorkspaceContact 添加可选 schemaVersion? 字段）
│   └── contact-storage.ts  ← 新增：前端 invoke 封装（loadContacts / saveContact / deleteContact）
└── app/
    └── page.tsx         ← 修改：启动时从 Rust 加载联系人，替换 INITIAL_CONTACTS；
                            createContact / updateContactSkill 改为持久化写入

（不改动 UI 组件：profile-panel.tsx, chat-workspace.tsx, contact-sidebar.tsx 等）
```

**Structure Decision**: 单项目结构（前端 + Rust 在同一仓库）；持久化层改动集中在 `lib.rs` 和 `page.tsx`，最小化影响面。

## Complexity Tracking

> 无 Constitution 违例，此章节留空。

---

*Phase 0 产物见 [research.md](./research.md)*
*Phase 1 产物见 [data-model.md](./data-model.md)、[contracts/tauri-commands.md](./contracts/tauri-commands.md)、[quickstart.md](./quickstart.md)*
