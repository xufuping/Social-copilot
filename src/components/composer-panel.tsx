import { Link, Loader2, Mic, Quote, Send } from "lucide-react";
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
  onOpenModelConfig,
  onSend,
}: ComposerPanelProps) {
  return (
    <div className="border-t bg-card px-5 py-3">
      <div className="mx-auto flex max-w-5xl flex-col gap-2.5">
        <div className="rounded-xl border bg-background p-3">
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            联系人发送的内容
          </label>
          <div className="relative">
            <Textarea
              value={draft.incomingMessage}
              onChange={(event) => onDraftChange({ ...draft, incomingMessage: event.target.value })}
              placeholder="粘贴对方刚刚发来的消息。可以是一句话，也可以是多段聊天记录。"
              className="max-h-32 min-h-14 resize-none pr-20"
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
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
                aria-label="引用图片或文件"
                title="引用图片或文件，即将支持"
                disabled
              >
                <Quote className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-background p-3">
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            我对本次交流的预期
          </label>
          <Textarea
            value={draft.expectation}
            onChange={(event) => onDraftChange({ ...draft, expectation: event.target.value })}
            placeholder="告诉 AI 这次你想怎么回复：可以写话题背景、你猜测对方的想法、希望达到的效果、语气风格、不要踩的雷。例如：这是项目延期沟通，我希望显得负责但不要背锅；对方可能有点不满，语气要真诚、稳一点。"
            className="max-h-32 min-h-16 resize-none"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {promptChips.map((chip) => (
              <Button
                key={chip}
                type="button"
                variant="secondary"
                size="xs"
                onClick={() => onPromptChipClick(chip)}
              >
                {chip}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Select
              value={model}
              onValueChange={(value) => {
                if (value) onModelChange(value);
              }}
            >
              <SelectTrigger className="h-9 w-48 text-sm">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mock">Mock 模型</SelectItem>
                <SelectItem value="openai-compatible">OpenAI-compatible</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={onOpenModelConfig}>
              配置模型
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label="语音输入"
              title="语音输入，即将支持"
              disabled
            >
              <Mic className="size-4" />
            </Button>
            <Button
              type="button"
              size="lg"
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
        {sendDisabledReason ? (
          <div className="text-right text-xs text-muted-foreground">{sendDisabledReason}</div>
        ) : null}
      </div>
    </div>
  );
}
