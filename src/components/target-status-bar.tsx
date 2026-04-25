"use client";

/**
 * TargetStatusBar - 当前"聊天对象"状态栏。
 *
 * 阶段一：名称来源是 Mock（硬编码的 "张总"）。
 * 阶段三：名称来源将改为 Rust Tauri Command，从微信窗口 Title 捕获。
 *
 * 设计要点：
 *   - 若 `contactName` 为 null/空字符串，显示 "未捕获到聊天窗口" 的友好降级态；
 *   - 右侧 online 点用纯样式，不依赖真实连接状态，仅表达"探针在线"。
 */

import { User } from "lucide-react";

interface TargetStatusBarProps {
  contactName: string | null;
  /** 是否正在从系统探针刷新（阶段三才会为 true） */
  isProbing?: boolean;
}

export function TargetStatusBar({ contactName, isProbing = false }: TargetStatusBarProps) {
  const hasTarget = Boolean(contactName && contactName.trim().length > 0);

  return (
    <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
      <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        <User className="size-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">当前聊天对象</div>
        <div
          className={
            "truncate text-sm font-semibold " +
            (hasTarget ? "text-foreground" : "text-muted-foreground")
          }
        >
          {hasTarget ? contactName : "未捕获到聊天窗口"}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className={
            "inline-block size-2 rounded-full " +
            (hasTarget ? "bg-emerald-500" : "bg-zinc-400")
          }
        />
        <span className="text-[10px] text-muted-foreground">
          {isProbing ? "刷新中" : hasTarget ? "已连接" : "待捕获"}
        </span>
      </div>
    </div>
  );
}
