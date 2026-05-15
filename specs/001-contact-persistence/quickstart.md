# Quickstart: F001 Contact Persistence

**目标读者**: 在本 feature 分支上进行开发的工程师
**分支**: `001-contact-persistence`

---

## 环境准备

```bash
# 安装依赖（如未安装）
pnpm install

# 验证 Rust 工具链
cargo check --manifest-path src-tauri/Cargo.toml

# 启动开发服务器（纯前端，无 Tauri）
pnpm dev

# 启动完整 Tauri 开发环境（需要）
pnpm tauri dev
```

---

## 开发顺序（推荐）

按以下顺序开发，每一步完成后验证不破坏现有功能：

### Step 1：Rust — 新增 `ContactFileData` + 工具函数

**文件**: `src-tauri/src/lib.rs`

新增内容：
1. `ContactFileData` struct（见 `data-model.md`）
2. `sanitize_filename(name: &str) -> String` 工具函数
3. `contacts_dir(app: &tauri::AppHandle) -> Result<PathBuf, String>` 工具函数
4. `find_contact_file(dir: &Path, contact_id: &str) -> Option<PathBuf>` 工具函数

验证：
```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

---

### Step 2：Rust — 实现 4 个 Tauri Commands

**文件**: `src-tauri/src/lib.rs`

按 `contracts/tauri-commands.md` 实现：
1. `load_contacts` — 扫描目录，批量加载
2. `save_contact` — sanitize、重名处理、写文件
3. `delete_contact` — 按 ID 删除
4. `sanitize_contact_name` — 纯函数

注册到 `invoke_handler`（见 `contracts/tauri-commands.md` 末尾示例）

验证：
```bash
cargo check --manifest-path src-tauri/Cargo.toml
# 可添加 #[cfg(test)] 单元测试验证 sanitize_filename 规则
```

---

### Step 3：TypeScript — 最小化类型更新

**文件**: `src/lib/types.ts`

- `WorkspaceContact` 添加 `schemaVersion?: number`（见 `data-model.md`）

验证：
```bash
pnpm lint
pnpm build
```

---

### Step 4：TypeScript — 新建 `contact-storage.ts`

**文件**: `src/lib/contact-storage.ts`（新建）

按 `contracts/tauri-commands.md` 中的前端封装模块实现 4 个 invoke 封装函数

验证：
```bash
pnpm lint
pnpm build
```

---

### Step 5：前端 — 更新 `page.tsx` 加载逻辑

**文件**: `src/app/page.tsx`

改动要点：
1. 移除 `INITIAL_CONTACTS` 硬编码数组（或保留作为 pnpm dev 浏览器模式降级数据，添加 isTauri() 判断）
2. 添加 `useEffect` 调用 `loadContacts()`，在 Tauri 环境下替换初始联系人列表
3. 修改 `createContact` 函数：创建内存对象后，调用 `saveContact(nextContact)` 持久化
4. 添加 loading 状态：加载中显示骨架屏或 spinner（空列表也可接受，用于 F001 最小可行）

验证：
```bash
pnpm lint
pnpm build
pnpm tauri dev  # 验证创建联系人后重启应用可恢复
```

---

### Step 6：前端 — 接入画像编辑持久化

**文件**: `src/app/page.tsx`（或提取为独立 hook）

改动要点：
1. `ProfilePanel` 的 `onChange` 触发时（标签增删、备注编辑），除了更新内存状态，同时调用 `saveContact(updatedContact)`
2. `attributeDefinition` 编辑时（如有编辑入口）同样触发 `saveContact`
3. 写入失败时：将错误写入对应联系人工作台的 `error` 字段（Constitution Principle V 要求）

验证：
```bash
pnpm lint
pnpm build
pnpm tauri dev  # 验证修改画像后重启应用数据保持
```

---

### Step 7：AI 链路验证（FR-007）

**不需要代码改动**（因为 `AiSuggestionRequest.contact` 已经是 `selectedContact`，一旦 Step 5 接入持久化数据，FR-007 自动满足）

验证步骤：
1. 启动 Tauri 应用
2. 新建联系人"测试用户"，填写属性定义"专业严谨"
3. 重启应用
4. 选择"测试用户"，粘贴一条消息，发送 AI 请求
5. 观察系统 Prompt（通过 Rust 日志或 HTTP 抓包）确认 `contact` 字段来自持久化数据

---

## 验收检查清单

在 PR 前执行以下全部检查：

```bash
# 1. Rust 编译检查
cargo check --manifest-path src-tauri/Cargo.toml

# 2. TypeScript lint
pnpm lint

# 3. Next.js 静态导出构建
pnpm build

# 4. 手动验收（Tauri 环境）
# - 新建联系人 → 重启应用 → 联系人存在 ✅
# - 修改标签 → 重启应用 → 标签保持 ✅
# - 创建含特殊字符姓名的联系人 → 重启后可恢复 ✅
# - 创建两个同名联系人 → 两个均存在 ✅
# - AI 请求 contact 字段来自持久化数据（非 MOCK_CONTACT）✅
```

---

## 关键文件一览

| 文件 | 角色 | 改动类型 |
|------|------|---------|
| `src-tauri/src/lib.rs` | 持久化核心实现 | 新增 struct + 4 Commands |
| `src/lib/contact-storage.ts` | 前端 invoke 封装 | 新建 |
| `src/lib/types.ts` | TypeScript 类型 | 最小改动（添加 `schemaVersion?`）|
| `src/app/page.tsx` | 应用主页面 | 加载逻辑 + 创建/编辑触发持久化 |

---

## 浏览器模式降级

`pnpm dev`（非 Tauri）下的行为：
- `loadContacts()` → 返回空数组（`isTauriEnv()` 检测为 false）
- `saveContact()` → 静默忽略
- 可选：在浏览器模式下仍加载 `INITIAL_CONTACTS` 作为开发预览数据（通过 `if (!isTauriEnv())` 判断）

---

## 持久化数据目录（开发阶段）

macOS 开发模式下数据存储在：
```
~/Library/Application Support/com.social-copilot.app/contacts/
```

清理测试数据：
```bash
rm -rf ~/Library/Application\ Support/com.social-copilot.app/contacts/
```
