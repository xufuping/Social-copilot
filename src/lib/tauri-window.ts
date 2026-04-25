/**
 * Tauri 窗口控制的浏览器安全包装。
 *
 * 背景：阶段一我们用 `pnpm dev`（纯浏览器）和 `pnpm tauri:dev`（Tauri 外壳）
 *      两种方式启动。`@tauri-apps/api/window` 在纯浏览器中调用 `getCurrentWindow()`
 *      会抛错，所以这里做统一兜底：非 Tauri 环境下降级为 no-op。
 *
 * 判定方式：Tauri v2 会向 window 注入 `__TAURI_INTERNALS__`。
 */

/** 运行时是否处于 Tauri 外壳内 */
export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

/**
 * 最小化当前窗口。浏览器环境下仅打印日志。
 *
 * 懒加载 `@tauri-apps/api/window`，避免 SSR 或静态导出时把 Tauri 代码
 * 打进服务端 bundle。
 */
export async function minimizeWindow(): Promise<void> {
  if (!isTauri()) {
    console.info("[tauri-window] minimize skipped (not running inside Tauri)");
    return;
  }
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().minimize();
}

/** 关闭当前窗口。浏览器环境下仅打印日志。 */
export async function closeWindow(): Promise<void> {
  if (!isTauri()) {
    console.info("[tauri-window] close skipped (not running inside Tauri)");
    return;
  }
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().close();
}

/** 切换"始终置顶" */
export async function toggleAlwaysOnTop(nextValue: boolean): Promise<void> {
  if (!isTauri()) {
    console.info(`[tauri-window] alwaysOnTop → ${nextValue} skipped (not in Tauri)`);
    return;
  }
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setAlwaysOnTop(nextValue);
}
