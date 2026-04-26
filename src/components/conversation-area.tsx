import { Bot, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SuggestionCard } from "@/components/suggestion-card";
import type { ComposerDraft, Suggestion } from "@/lib/types";

interface ConversationAreaProps {
  draft: ComposerDraft;
  isMockModel: boolean;
  error: string | null;
  isGenerating: boolean;
  suggestions: Suggestion[];
  selectedSuggestion?: Suggestion;
  copiedSuggestionId: string | null;
  onSelectSuggestionPreview: (suggestionId: string) => void;
  onCopySuggestion: (suggestion: Suggestion) => void;
}

export function ConversationArea({
  draft,
  isMockModel,
  error,
  isGenerating,
  suggestions,
  selectedSuggestion,
  copiedSuggestionId,
  onSelectSuggestionPreview,
  onCopySuggestion,
}: ConversationAreaProps) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] gap-4 overflow-hidden px-5 py-4">
      <div className="min-h-0 overflow-y-auto pr-1">
        <div className="flex min-h-full flex-col gap-4">
          {!isMockModel ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              当前选择的模型会通过 Tauri Command 请求 Rust 层。Provider 尚未配置时，Rust 层会返回可理解错误，API Key 不进入前端。
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {isGenerating ? (
            <Card>
              <CardContent className="flex items-center gap-3 px-4 py-5 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                AI 正在根据联系人画像与本次输入生成候选回复…
              </CardContent>
            </Card>
          ) : suggestions.length > 0 ? (
            <div className="grid gap-3">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => onSelectSuggestionPreview(suggestion.id)}
                  className={
                    "rounded-xl text-left transition " +
                    (selectedSuggestion?.id === suggestion.id
                      ? "ring-2 ring-primary/30"
                      : "hover:ring-1 hover:ring-border")
                  }
                >
                  <SuggestionCard
                    suggestion={suggestion}
                    copied={copiedSuggestionId === suggestion.id}
                    onCopy={onCopySuggestion}
                  />
                </button>
              ))}
            </div>
          ) : (
            <Card className="flex flex-1 border-dashed">
              <CardContent className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
                <Bot className="size-8 text-muted-foreground" />
                <div className="text-sm font-medium">还没有生成候选回复</div>
                <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                  粘贴联系人发来的消息，补充你的交流预期，然后点击发送。
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card className="min-h-0 gap-0 overflow-hidden">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MessageCircle className="size-4" />
            聊天模拟
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-muted/20 px-4 py-4">
          {draft.incomingMessage.trim() ? (
            <div className="flex justify-start">
              <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-background px-3 py-2 text-sm leading-relaxed shadow-sm">
                {draft.incomingMessage}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-background/70 px-3 py-8 text-center text-xs text-muted-foreground">
              粘贴联系人消息后，将在这里预览对话上下文。
            </div>
          )}

          {selectedSuggestion ? (
            <div className="flex justify-end">
              <div className="max-w-[88%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm leading-relaxed text-primary-foreground shadow-sm">
                {selectedSuggestion.text}
              </div>
            </div>
          ) : (
            <div className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-dashed bg-background/70 px-3 py-8 text-center text-xs text-muted-foreground">
              <Sparkles className="size-4" />
              生成后将在这里预览候选回复。
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
