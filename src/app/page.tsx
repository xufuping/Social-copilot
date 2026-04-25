"use client";

/**
 * 阶段一主视图。
 *
 * 本页面是纯客户端组件（"use client"），原因：
 *   1. Next.js 静态导出模式下，所有交互都发生在客户端；
 *   2. 阶段三需要调用 Tauri Command（浏览器 API），在 Server Component 里不可用。
 *
 * 状态拓扑（阶段一是本地 state；阶段四会替换为 Tauri 文件系统读写）：
 *
 *     contact (Contact)
 *        └─ skill (ContactSkill) ─── ProfilePanel
 *     intent (Intent)                ─── IntentSelector
 *     customIntents (Intent[])       ─── IntentSelector
 *     (on demand) suggestions        ─── SuggestionPanel
 */

import { useCallback, useMemo, useState } from "react";
import { IntentSelector } from "@/components/intent-selector";
import { ProfilePanel } from "@/components/profile-panel";
import { SuggestionPanel } from "@/components/suggestion-panel";
import { TargetStatusBar } from "@/components/target-status-bar";
import { Separator } from "@/components/ui/separator";
import { WindowDragBar } from "@/components/window-drag-bar";
import {
  MOCK_CONTACT,
  MOCK_RECENT_MESSAGES,
  PRESET_INTENTS,
  generateMockSuggestions,
} from "@/lib/mock";
import type { Contact, ContactSkill, Intent, Suggestion } from "@/lib/types";

export default function Home() {
  // 阶段一：单个 Mock 聊天对象。阶段三会改成由探针事件驱动更新。
  const [contact, setContact] = useState<Contact>(MOCK_CONTACT);

  // 当前意图：默认选第一个预置意图
  const [intent, setIntent] = useState<Intent>(PRESET_INTENTS[0]);
  const [customIntents, setCustomIntents] = useState<Intent[]>([]);

  // ProfilePanel 的 onChange 会只更新 skill 部分
  const handleSkillChange = useCallback((nextSkill: ContactSkill) => {
    setContact((prev) => ({ ...prev, skill: nextSkill }));
  }, []);

  // 组装建议请求：这是阶段二 Prompt Builder 的雏形
  const handleSuggestionRequest = useCallback(async (): Promise<Suggestion[]> => {
    return generateMockSuggestions({
      contact,
      intent,
      recentMessages: MOCK_RECENT_MESSAGES,
    });
  }, [contact, intent]);

  // 按钮禁用判定：目前只依赖是否有 contact name；阶段三还要看探针状态
  const canRequest = useMemo(
    () => Boolean(contact.name && contact.name.trim().length > 0),
    [contact.name],
  );

  return (
    <>
      <WindowDragBar />

      <TargetStatusBar contactName={contact.name} />

      <ProfilePanel skill={contact.skill} onChange={handleSkillChange} />

      <Separator />

      <div className="py-3">
        <IntentSelector
          value={intent}
          onChange={setIntent}
          customIntents={customIntents}
          onCustomIntentsChange={setCustomIntents}
        />
      </div>

      <Separator />

      <SuggestionPanel
        onRequest={handleSuggestionRequest}
        disabled={!canRequest}
      />
    </>
  );
}
