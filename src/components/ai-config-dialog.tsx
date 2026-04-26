import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AiProviderConfig } from "@/lib/types";

interface AiConfigDialogProps {
  open: boolean;
  initialConfig: AiProviderConfig | null;
  onClose: () => void;
  onSave: (config: AiProviderConfig) => Promise<void>;
}

const EMPTY_CONFIG: AiProviderConfig = {
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: "",
  model: "deepseek-chat",
};

export function AiConfigDialog({
  open,
  initialConfig,
  onClose,
  onSave,
}: AiConfigDialogProps) {
  const [config, setConfig] = useState<AiProviderConfig>(initialConfig ?? EMPTY_CONFIG);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSave = async () => {
    if (!config.baseUrl.trim()) {
      setError("请填写 Base URL");
      return;
    }
    if (!config.apiKey.trim()) {
      setError("请填写 API Key");
      return;
    }
    if (!config.model.trim()) {
      setError("请填写模型名");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        baseUrl: config.baseUrl.trim(),
        apiKey: config.apiKey.trim(),
        model: config.model.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存模型配置失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-xl">
        <div className="mb-4">
          <h2 className="text-base font-semibold">配置 OpenAI-compatible 模型</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            配置会保存到本机应用配置文件中，用于 Tauri Rust 层请求模型。API Key 不会写入前端代码。
          </p>
        </div>

        <div className="grid gap-3">
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Base URL</span>
            <Input
              value={config.baseUrl}
              onChange={(event) => setConfig((prev) => ({ ...prev, baseUrl: event.target.value }))}
              placeholder="https://api.deepseek.com/v1"
            />
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium text-muted-foreground">API Key</span>
            <Input
              value={config.apiKey}
              onChange={(event) => setConfig((prev) => ({ ...prev, apiKey: event.target.value }))}
              placeholder="sk-..."
              type="password"
            />
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium text-muted-foreground">模型名</span>
            <Input
              value={config.model}
              onChange={(event) => setConfig((prev) => ({ ...prev, model: event.target.value }))}
              placeholder="deepseek-chat"
            />
          </label>
        </div>

        {error ? (
          <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "保存中…" : "保存配置"}
          </Button>
        </div>
      </div>
    </div>
  );
}
