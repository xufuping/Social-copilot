"use client";

/**
 * 顶部拖拽条 + 自绘窗口控制按钮。
 *
 * 为什么需要它？
 *   阶段一我们在 `tauri.conf.json` 里设置了 `decorations: false`（无边框），
 *   macOS 的原生红绿灯信号灯不会显示，因此必须：
 *     1. 指定一块可拖拽区域（Tauri 使用 `data-tauri-drag-region` 作为标记）；
 *     2. 自己提供 "最小化 / 关闭" 的按钮。
 */

import { Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { closeWindow, minimizeWindow } from "@/lib/tauri-window";

export function WindowDragBar() {
  return (
    <div
      // data-tauri-drag-region：该元素及其空白区域可被拖拽移动窗口
      data-tauri-drag-region
      className="flex h-9 items-center justify-between rounded-t-xl border-b bg-background/80 px-2 backdrop-blur-md select-none"
    >
      <div
        data-tauri-drag-region
        className="flex-1 px-2 text-xs font-medium text-muted-foreground"
      >
        Social Copilot
      </div>

      <div className="flex items-center gap-1">
        <Button
          aria-label="最小化"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => void minimizeWindow()}
        >
          <Minus className="size-3.5" />
        </Button>
        <Button
          aria-label="关闭"
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => void closeWindow()}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
