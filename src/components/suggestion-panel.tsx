"use client";

/**
 * SuggestionPanel - "获取回应建议" 按钮 + 候选建议卡片列表。
 *
 * 核心交互链路：
 *   1. 用户点击 "获取回应建议"
 *   2. 调用外部传入的 `onRequest` → Promise<Suggestion[]>
 *   3. 加载期间按钮 loading + 灰色骨架卡片
 *   4. 返回后渲染 3 张 Suggestion 卡片，每张带"一键复制"
 *
 * 阶段二：`onRequest` 会被替换为真实 Vercel AI SDK 流式调用；
 *         届时本组件可升级为逐字流式展示（框架已预留 suggestions 数组）。
 */

import { Check, Copy, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Suggestion } from "@/lib/types";

interface SuggestionPanelProps {
  /** 触发生成；组件内部负责 loading/错误态 */
  onRequest: () => Promise<Suggestion[]>;
  /** 禁用按钮（例如尚未捕获聊天对象） */
  disabled?: boolean;
}

export function SuggestionPanel({ onRequest, disabled = false }: SuggestionPanelProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await onRequest();
      setSuggestions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败，请重试");
    } finally {
      setLoading(false);
    }
  }, [onRequest]);

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3 px-4 pb-4">
      <Button
        type="button"
        size="lg"
        className="w-full gap-2"
        disabled={disabled || loading}
        onClick={() => void handleClick()}
      >
        <Sparkles className="size-4" />
        {loading ? "生成中…" : "获取回应建议"}
      </Button>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-1 min-h-0 flex-col gap-2 overflow-y-auto pr-1">
        {loading ? (
          <SuggestionSkeleton />
        ) : suggestions.length === 0 ? (
          <EmptyHint />
        ) : (
          suggestions.map((s) => <SuggestionCard key={s.id} suggestion={s} />)
        )}
      </div>
    </div>
  );
}

/* -------------------- subcomponents -------------------- */

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const [copied, setCopied] = useState(false);

  // 2 秒后重置 "已复制" 状态
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(suggestion.text);
      setCopied(true);
    } catch {
      // 某些安全上下文下 clipboard API 不可用：降级为无 UI 反馈
      console.warn("[suggestion] clipboard API unavailable");
    }
  };

  return (
    <Card className="gap-2 py-3">
      <CardHeader className="px-3">
        <CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>{suggestion.style}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-xs"
            onClick={() => void handleCopy()}
          >
            {copied ? (
              <>
                <Check className="size-3" /> 已复制
              </>
            ) : (
              <>
                <Copy className="size-3" /> 复制
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {suggestion.text}
        </p>
      </CardContent>
    </Card>
  );
}

function SuggestionSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <Card key={i} className="gap-2 py-3">
          <CardContent className="flex flex-col gap-2 px-3">
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}

function EmptyHint() {
  return (
    <div className="flex flex-1 items-center justify-center rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
      点击上方按钮，让 AI 给你 3 条回应建议
    </div>
  );
}
