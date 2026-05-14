import { Link, Loader2, Mic, Quote, Send, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ComposerDraft } from "@/lib/types";

interface ComposerPanelProps {
  draft: ComposerDraft;
  model: string;
  promptChips: string[];
  isGenerating: boolean;
  canSend: boolean;
  sendDisabledReason: string;
  onDraftChange: (nextDraft: ComposerDraft) => void;
  onModelChange: (model: string) => void;
  onPromptChipClick: (chip: string) => void;
  onClearExpectation: () => void;
  onOpenModelConfig: () => void;
  onSend: () => void;
}

export function ComposerPanel({
  draft,
  model,
  promptChips,
  isGenerating,
  canSend,
  sendDisabledReason,
  onDraftChange,
  onModelChange,
  onPromptChipClick,
  onClearExpectation,
  onOpenModelConfig,
  onSend,
}: ComposerPanelProps) {
  const hasExpectation = Boolean(draft.expectation.trim());

  return (
    <div className="bg-card px-5 py-3">
      <div className="mx-auto flex min-h-0 min-w-0 max-w-6xl flex-col gap-3">
        <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch">
          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-background p-3 lg:h-full">
            <div className="relative flex min-h-0 flex-1 flex-col">
              <Textarea
                value={draft.incomingMessage}
                onChange={(event) =>
                  onDraftChange({ ...draft, incomingMessage: event.target.value })
                }
                placeholder="粘贴对方发来的消息。"
                className="max-h-40 min-h-[4.5rem] w-full flex-1 resize-none pr-14 pb-9"
              />
              <div className="pointer-events-none absolute right-4 bottom-4 flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="pointer-events-auto"
                  aria-label="链接聊天应用"
                  title="链接聊天应用，即将支持"
                  disabled
                >
                  <Link className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="pointer-events-auto"
                  aria-label="引用图片或文件"
                  title="引用图片或文件，即将支持"
                  disabled
                >
                  <Quote className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col rounded-xl border bg-background p-3 lg:h-full">
            <div className="mb-2 flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                交流预期
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {promptChips.map((chip) => (
                  <Button
                    key={chip}
                    type="button"
                    variant="secondary"
                    size="xs"
                    className="h-6 shrink-0 px-2 text-[11px]"
                    onClick={() => onPromptChipClick(chip)}
                  >
                    {chip}
                  </Button>
                ))}
              </div>
            </div>
            <Textarea
              value={draft.expectation}
              onChange={(event) =>
                onDraftChange({ ...draft, expectation: event.target.value })
              }
              placeholder="告诉 AI 这次你想怎么回复：可以写话题背景、你猜测对方的想法、希望达到的效果、语气风格、不要踩的雷。例如：这是项目延期沟通，我希望显得负责但不要背锅；对方可能有点不满，语气要真诚、稳一点。"
              className="max-h-40 min-h-[4.5rem] flex-1 resize-none"
            />

            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="size-7 shrink-0"
                  aria-label="配置模型"
                  title="配置模型（API / Provider）"
                  onClick={onOpenModelConfig}
                >
                  <Settings2 className="size-4" />
                </Button>
                <Select
                  value={model}
                  onValueChange={(value) => {
                    if (value) onModelChange(value);
                  }}
                >
                  <SelectTrigger className="h-7 w-[11.5rem] text-xs" size="sm">
                    <SelectValue placeholder="选择模型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mock">Mock 模型</SelectItem>
                    <SelectItem value="openai-compatible">OpenAI-compatible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="size-7 shrink-0"
                aria-label="语音输入"
                title="语音输入即将支持"
                disabled
              >
                <Mic className="size-4" />
              </Button>
              <Button
                type="button"
                variant={hasExpectation ? "default" : "outline"}
                size="default"
                disabled={!hasExpectation}
                className={
                  !hasExpectation ? "text-muted-foreground opacity-60" : undefined
                }
                aria-label="清空交流预期"
                title={hasExpectation ? "清空交流预期" : "无可清空内容"}
                onClick={onClearExpectation}
              >
                清空
              </Button>
              <Button
                type="button"
                size="default"
                disabled={!canSend}
                title={sendDisabledReason || "发送给 AI"}
                onClick={onSend}
              >
                {isGenerating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                发送
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
