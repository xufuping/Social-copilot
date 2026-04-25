"use client";

/**
 * IntentSelector - 当前沟通意图选择器。
 *
 * 设计：
 *   - 主体是一个下拉 (Shadcn Select)；
 *   - 提供"自定义"按钮，点击后弹出一行 Input 让用户输入新意图标签；
 *   - 自定义意图与内置意图合并为一个列表对外暴露，但只在本组件内部管理。
 *
 * 后续（阶段四）：自定义意图可以序列化进 AppData，实现用户级偏好持久化。
 *                  本组件预留 `customIntents` + `onCustomIntentsChange` 回调位。
 */

import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRESET_INTENTS } from "@/lib/mock";
import type { Intent } from "@/lib/types";

interface IntentSelectorProps {
  value: Intent;
  onChange: (intent: Intent) => void;
  customIntents: Intent[];
  onCustomIntentsChange: (next: Intent[]) => void;
}

export function IntentSelector({
  value,
  onChange,
  customIntents,
  onCustomIntentsChange,
}: IntentSelectorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const allIntents = useMemo(
    () => [...PRESET_INTENTS, ...customIntents],
    [customIntents],
  );

  const addCustomIntent = () => {
    const label = draft.trim();
    if (!label) return;
    if (allIntents.some((i) => i.label === label)) {
      setDraft("");
      setIsAdding(false);
      return;
    }
    const newIntent: Intent = {
      id: `custom-${Date.now()}`,
      label,
      description: `User-defined intent: ${label}`,
      custom: true,
    };
    onCustomIntentsChange([...customIntents, newIntent]);
    onChange(newIntent);
    setDraft("");
    setIsAdding(false);
  };

  const removeCustomIntent = (id: string) => {
    const next = customIntents.filter((i) => i.id !== id);
    onCustomIntentsChange(next);
    // 若当前选中的就是被删的，回退到第一个预置意图
    if (value.id === id) onChange(PRESET_INTENTS[0]);
  };

  return (
    <div className="flex flex-col gap-2 px-4">
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        当前意图
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={value.id}
          onValueChange={(id) => {
            const next = allIntents.find((i) => i.id === id);
            if (next) onChange(next);
          }}
        >
          <SelectTrigger className="h-9 flex-1 text-sm">
            <SelectValue placeholder="选择一个意图" />
          </SelectTrigger>
          <SelectContent>
            {PRESET_INTENTS.map((intent) => (
              <SelectItem key={intent.id} value={intent.id}>
                {intent.label}
              </SelectItem>
            ))}
            {customIntents.length > 0 ? (
              <div className="my-1 border-t" aria-hidden />
            ) : null}
            {customIntents.map((intent) => (
              <SelectItem key={intent.id} value={intent.id}>
                <span className="flex w-full items-center justify-between gap-2">
                  <span>{intent.label}</span>
                  <span
                    role="button"
                    aria-label={`删除自定义意图 ${intent.label}`}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeCustomIntent(intent.id);
                    }}
                  >
                    <X className="size-3" />
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-9 w-9 shrink-0"
          aria-label="自定义意图"
          onClick={() => setIsAdding((v) => !v)}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {isAdding ? (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomIntent();
              } else if (e.key === "Escape") {
                setIsAdding(false);
                setDraft("");
              }
            }}
            placeholder="新意图名称，回车保存"
            className="h-8 text-sm"
          />
          <Button
            type="button"
            size="sm"
            className="h-8"
            onClick={addCustomIntent}
          >
            保存
          </Button>
        </div>
      ) : null}
    </div>
  );
}
