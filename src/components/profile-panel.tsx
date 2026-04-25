"use client";

/**
 * ProfilePanel - 聊天对象画像面板。
 *
 * 职责：
 *   - 展示 `contact.skill.manual_tags`，支持增/删；
 *   - 阶段二后还会展示 `distilled_traits`（由 AI 自动提炼，用户只读）；
 *   - 阶段四，任何修改都会触发 Rust 侧持久化写入 `[contact_name].json`。
 *
 * 本组件是"受控"的：所有状态由父组件管理，修改通过 onChange 回调上报。
 */

import { Plus, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ContactSkill } from "@/lib/types";

interface ProfilePanelProps {
  skill: ContactSkill;
  onChange: (nextSkill: ContactSkill) => void;
}

export function ProfilePanel({ skill, onChange }: ProfilePanelProps) {
  const [draftTag, setDraftTag] = useState("");

  const addTag = () => {
    const trimmed = draftTag.trim();
    if (!trimmed) return;
    if (skill.manual_tags.includes(trimmed)) {
      setDraftTag("");
      return;
    }
    onChange({
      ...skill,
      manual_tags: [...skill.manual_tags, trimmed],
      updated_at: new Date().toISOString(),
    });
    setDraftTag("");
  };

  const removeTag = (tag: string) => {
    onChange({
      ...skill,
      manual_tags: skill.manual_tags.filter((t) => t !== tag),
      updated_at: new Date().toISOString(),
    });
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }
  };

  return (
    <Card className="border-0 shadow-none bg-transparent gap-3 py-3">
      <CardHeader className="px-4">
        <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          对象画像
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 px-4">
        {/* 手工标签列表 */}
        <div className="flex flex-wrap gap-1.5">
          {skill.manual_tags.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              还没有画像标签，添加一个吧
            </span>
          ) : (
            skill.manual_tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="gap-1 pr-1 text-xs"
              >
                {tag}
                <button
                  type="button"
                  aria-label={`删除标签 ${tag}`}
                  onClick={() => removeTag(tag)}
                  className="rounded-sm p-0.5 hover:bg-background/60"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))
          )}
        </div>

        {/* 新增标签输入 */}
        <div className="flex items-center gap-2">
          <Input
            value={draftTag}
            onChange={(e) => setDraftTag(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="输入新标签，回车或点击 + 添加"
            className="h-8 text-sm"
          />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-8 w-8 shrink-0"
            onClick={addTag}
            aria-label="添加标签"
          >
            <Plus className="size-4" />
          </Button>
        </div>

        {/* 备忘区（只读一行预览） */}
        {skill.notes ? (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {skill.notes}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
