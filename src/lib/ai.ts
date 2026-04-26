import { isTauri } from "@/lib/tauri-window";
import type { AiProviderConfig, AiSuggestionRequest, Suggestion } from "@/lib/types";

export async function requestAiSuggestions(
  request: AiSuggestionRequest,
): Promise<Suggestion[]> {
  if (!isTauri()) {
    throw new Error("真实模型需要在 Tauri 桌面端中使用。浏览器预览请切回 Mock 模型。");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<Suggestion[]>("generate_ai_suggestions", { request });
}

export async function getAiProviderConfig(): Promise<AiProviderConfig | null> {
  if (!isTauri()) return null;

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<AiProviderConfig | null>("get_ai_config");
}

export async function saveAiProviderConfig(config: AiProviderConfig): Promise<void> {
  if (!isTauri()) {
    throw new Error("模型配置需要在 Tauri 桌面端中保存。");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("save_ai_config", { config });
}
