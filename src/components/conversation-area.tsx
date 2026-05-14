import { Bot, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SuggestionCard } from "@/components/suggestion-card";
import type {
  ComposerDraft,
  Message,
  Suggestion,
  SuggestionStyleMode,
  WorkspaceContact,
} from "@/lib/types";

interface ConversationAreaProps {
  contact: WorkspaceContact;
  draft: ComposerDraft;
  peerMessages: Message[];
  isMockModel: boolean;
  error: string | null;
  isGenerating: boolean;
  suggestions: Suggestion[];
  selectedSuggestion?: Suggestion;
  suggestionTextOverrides: Record<string, string>;
  suggestionCount: number;
  suggestionStyleMode: SuggestionStyleMode;
  copiedSuggestionId: string | null;
  onSuggestionCountChange: (count: number) => void;
  onSuggestionStyleModeChange: (mode: SuggestionStyleMode) => void;
  onSuggestionBodyChange: (suggestionId: string, text: string) => void;
  onSelectSuggestionPreview: (suggestionId: string) => void;
  onCopySuggestionText: (suggestionId: string, text: string) => void;
}

/** 顶栏：skill 蒸馏 = 外部 md 路径引用 */
function skillDistilledPathLine(contact: WorkspaceContact): { short: string; title: string } {
  if (contact.skill.skillFileError) {
    return {
      short: "读取失败",
      title: "蒸馏 Markdown 读取失败，请检查路径或文件权限。",
    };
  }
  const path = contact.skill.distilled_md_path?.trim();
  if (!path) {
    return {
      short: "未关联",
      title: "尚未绑定蒸馏 Markdown 文件路径（distilled_md_path）。",
    };
  }
  const short = path.length > 24 ? `${path.slice(0, 24)}…` : path;
  return { short, title: path };
}

function attributeDefinitionHoverText(contact: WorkspaceContact): string {
  const attr = contact.attributeDefinition.trim() || "（未填写属性定义）";
  const extra = [contact.summary?.trim() && `摘要：${contact.summary.trim()}`]
    .filter(Boolean)
    .join("\n");
  return extra ? `${attr}\n${extra}` : attr;
}

export function ConversationArea({
  contact,
  draft,
  peerMessages,
  isMockModel,
  error,
  isGenerating,
  suggestions,
  selectedSuggestion,
  suggestionTextOverrides,
  suggestionCount,
  suggestionStyleMode,
  copiedSuggestionId,
  onSuggestionCountChange,
  onSuggestionStyleModeChange,
  onSuggestionBodyChange,
  onSelectSuggestionPreview,
  onCopySuggestionText,
}: ConversationAreaProps) {
  const attrFull = contact.attributeDefinition.trim();
  const attrShort =
    attrFull.length > 36 ? `${attrFull.slice(0, 36)}…` : attrFull || "（未填写属性定义）";
  const attrHover = attributeDefinitionHoverText(contact);
  const skillPath = skillDistilledPathLine(contact);

  const previewSelfText = selectedSuggestion
    ? (suggestionTextOverrides[selectedSuggestion.id] ?? selectedSuggestion.text)
    : "";

  const showPeerPasteHint =
    peerMessages.length === 0 &&
    !draft.incomingMessage.trim() &&
    suggestions.length === 0;

  const previewColumn = (
    <Card className="flex min-h-0 min-w-0 flex-col gap-0 overflow-hidden shadow-sm ring-1 ring-border/60">
      <div
        className="flex h-5 shrink-0 items-center gap-x-1.5 border-b border-border/80 bg-muted/30 px-1.5 py-0 text-[8px] leading-tight"
        aria-label="当前联系人上下文"
      >
        <span className="shrink-0 text-muted-foreground">属性定义</span>
        <span
          className="min-w-0 flex-[1.1] cursor-default truncate font-medium text-foreground"
          title={attrHover}
        >
          {attrShort}
        </span>
        <span className="shrink-0 text-muted-foreground">skill蒸馏</span>
        <span
          className="min-w-0 max-w-[42%] shrink-0 cursor-default truncate font-mono text-[7px] text-foreground"
          title={skillPath.title}
        >
          {skillPath.short}
        </span>
      </div>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto bg-muted/20 px-2.5 py-1.5">
        {peerMessages.map((msg) => (
          <div key={msg.id} className="flex justify-start">
            <div className="max-w-[88%] rounded-lg rounded-tl-sm bg-background px-2 py-0.5 text-[10px] leading-tight shadow-sm ring-1 ring-border/40">
              {msg.text}
            </div>
          </div>
        ))}
        {draft.incomingMessage.trim() ? (
          <div className="flex justify-start">
            <div className="max-w-[88%] rounded-lg rounded-tl-sm bg-background px-2 py-0.5 text-[10px] leading-tight shadow-sm ring-1 ring-border/40">
              {draft.incomingMessage}
            </div>
          </div>
        ) : showPeerPasteHint ? (
          <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-background/70 px-2 py-3 text-center text-[10px] leading-snug text-muted-foreground">
            粘贴联系人消息后，将在这里预览对话上下文。
          </div>
        ) : null}

        {selectedSuggestion && previewSelfText.trim() ? (
          <div className="flex justify-end">
            <div className="max-w-[88%] rounded-lg rounded-tr-sm bg-primary px-2 py-0.5 text-[10px] leading-tight text-primary-foreground shadow-sm ring-1 ring-primary/20">
              {previewSelfText}
            </div>
          </div>
        ) : (
          <div className="mt-auto flex items-center justify-center gap-1 rounded-lg border border-dashed border-muted-foreground/25 bg-background/70 px-2 py-4 text-center text-[10px] leading-snug text-muted-foreground">
            <Sparkles className="size-3 shrink-0" />
            生成后将在这里预览候选回复。
          </div>
        )}
      </CardContent>
    </Card>
  );

  const suggestionsColumn = (
    <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">回复条数</span>
          <Select
            value={String(suggestionCount)}
            onValueChange={(value) => {
              if (value) onSuggestionCountChange(Number.parseInt(value, 10));
            }}
          >
            <SelectTrigger className="h-6 w-[4.75rem] text-[11px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 8 }, (_, i) => i + 3).map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} 条
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-0.5 rounded-md border bg-background px-0.5 py-0.5">
          <span className="px-1 text-[11px] text-muted-foreground">展示</span>
          <Button
            type="button"
            variant={suggestionStyleMode === "title" ? "default" : "ghost"}
            size="xs"
            className="h-6 px-2 text-[11px]"
            onClick={() => onSuggestionStyleModeChange("title")}
          >
            标题
          </Button>
          <Button
            type="button"
            variant={suggestionStyleMode === "minimal" ? "default" : "ghost"}
            size="xs"
            className="h-6 px-2 text-[11px]"
            onClick={() => onSuggestionStyleModeChange("minimal")}
          >
            极简
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col gap-2 px-1.5 pt-1 pb-2">
          {!isMockModel ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] leading-snug text-amber-800">
              当前选择的模型会通过 Tauri Command 请求 Rust 层。Provider 尚未配置时，Rust
              层会返回可理解错误，API Key 不进入前端。
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[10px] text-destructive">
              {error}
            </div>
          ) : null}

          {isGenerating ? (
            <Card className="overflow-visible py-0 shadow-sm ring-1 ring-border/60">
              <CardContent className="flex items-center gap-2 px-2 py-1.5 text-[10px] text-muted-foreground">
                <Loader2 className="size-3 shrink-0 animate-spin" />
                AI 正在生成候选回复…
              </CardContent>
            </Card>
          ) : suggestions.length > 0 ? (
            <div className="grid gap-2">
              {suggestions.map((suggestion) => {
                const bodyText =
                  suggestionTextOverrides[suggestion.id] ?? suggestion.text;
                return (
                  <div
                    key={suggestion.id}
                    role="presentation"
                    onClick={() => onSelectSuggestionPreview(suggestion.id)}
                    className={
                      "cursor-pointer rounded-xl text-left transition " +
                      (selectedSuggestion?.id === suggestion.id
                        ? "ring-2 ring-primary/40 ring-inset"
                        : "ring-1 ring-transparent hover:ring-border/90 hover:ring-inset")
                    }
                  >
                    <SuggestionCard
                      suggestion={suggestion}
                      bodyText={bodyText}
                      styleMode={suggestionStyleMode}
                      copied={copiedSuggestionId === suggestion.id}
                      onBodyChange={(text) => onSuggestionBodyChange(suggestion.id, text)}
                      onCopy={(text) => onCopySuggestionText(suggestion.id, text)}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <Card className="flex flex-1 overflow-visible border-dashed py-0 shadow-sm">
              <CardContent className="flex flex-1 flex-col items-center justify-center gap-1.5 px-3 py-8 text-center">
                <Bot className="size-6 text-muted-foreground" />
                <div className="text-[10px] font-medium">还没有生成候选回复</div>
                <p className="max-w-sm text-[10px] leading-snug text-muted-foreground">
                  粘贴联系人发来的消息，补充你的交流预期，然后点击发送。
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(220px,260px)_minmax(0,1fr)] gap-3 px-4 py-3">
      {previewColumn}
      {suggestionsColumn}
    </div>
  );
}
