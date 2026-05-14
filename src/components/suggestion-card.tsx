"use client";

import { useLayoutEffect, useRef } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { Suggestion, SuggestionStyleMode } from "@/lib/types";

interface SuggestionCardProps {
  suggestion: Suggestion;
  bodyText: string;
  styleMode: SuggestionStyleMode;
  copied: boolean;
  onBodyChange: (text: string) => void;
  onCopy: (text: string) => void;
}

/** 标题模式：正文较 style 标签小一号 */
const bodyTitleModeClass =
  "min-h-0 resize-none border-0 bg-transparent px-0 py-0 text-[8px] leading-tight shadow-none focus-visible:ring-0";

/** 极简：正文再小一号 */
const bodyMinimalClass =
  "min-h-0 resize-none border-0 bg-transparent px-0 py-0 text-[7px] leading-tight shadow-none focus-visible:ring-0";

function AutoHeightTextarea({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  className: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <Textarea
      ref={ref}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={1}
      className={className}
      placeholder={placeholder}
    />
  );
}

export function SuggestionCard({
  suggestion,
  bodyText,
  styleMode,
  copied,
  onBodyChange,
  onCopy,
}: SuggestionCardProps) {
  const showStyleHeader = styleMode === "title" && Boolean(suggestion.style?.trim());

  if (styleMode === "minimal") {
    return (
      <Card className="gap-0 !overflow-visible py-0 shadow-sm ring-1 ring-border/60">
        <CardContent className="flex items-center gap-0.5 px-2 py-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground [&_svg]:size-2.5"
            aria-label={copied ? "已复制" : "复制回复文案"}
            title={copied ? "已复制" : "复制"}
            onClick={() => onCopy(bodyText)}
          >
            {copied ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
          </Button>
          <AutoHeightTextarea
            value={bodyText}
            onChange={onBodyChange}
            className={`flex-1 ${bodyMinimalClass}`}
            placeholder="点击编辑回复文案…"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-0 !overflow-visible py-0 shadow-sm ring-1 ring-border/60">
      {showStyleHeader ? (
        <CardHeader className="flex flex-row items-center justify-between gap-2 px-2 py-1">
          <CardTitle className="flex min-w-0 items-center gap-1 text-[10px] font-medium leading-tight">
            <Sparkles className="size-3 shrink-0 text-primary" />
            <span className="truncate">{suggestion.style}</span>
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-5 shrink-0 px-1.5 text-[10px]"
            onClick={() => onCopy(bodyText)}
          >
            {copied ? (
              <>
                <Check className="size-2.5" />
                已复制
              </>
            ) : (
              <>
                <Copy className="size-2.5" />
                复制
              </>
            )}
          </Button>
        </CardHeader>
      ) : (
        <CardHeader className="flex flex-row items-center justify-end border-0 px-2 py-0.5">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-5 px-1.5 text-[10px]"
            onClick={() => onCopy(bodyText)}
          >
            {copied ? (
              <>
                <Check className="size-2.5" />
                已复制
              </>
            ) : (
              <>
                <Copy className="size-2.5" />
                复制
              </>
            )}
          </Button>
        </CardHeader>
      )}
      <CardContent className="px-2 pb-1 pt-0">
        <AutoHeightTextarea
          value={bodyText}
          onChange={onBodyChange}
          className={bodyTitleModeClass}
          placeholder="点击编辑回复文案…"
        />
      </CardContent>
    </Card>
  );
}
