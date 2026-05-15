"use client";

import { useEffect, useMemo, useState } from "react";
import { AiConfigDialog } from "@/components/ai-config-dialog";
import { ChatWorkspace } from "@/components/chat-workspace";
import { ContactSidebar } from "@/components/contact-sidebar";
import { WindowDragBar } from "@/components/window-drag-bar";
import { getAiProviderConfig, requestAiSuggestions, saveAiProviderConfig } from "@/lib/ai";
import { loadContacts, saveContact } from "@/lib/contact-storage";
import { generateMockSuggestions } from "@/lib/mock";
import {
  loadPeerMessagesMap,
  persistPeerMessagesForContact,
} from "@/lib/peer-message-storage";
import type {
  AiSuggestionRequest,
  AiProviderConfig,
  ComposerDraft,
  ContactSkill,
  ContactWorkspaceState,
  Intent,
  Message,
  SuggestionStyleMode,
  WorkspaceContact,
} from "@/lib/types";

const PROMPT_CHIPS = [
  "暧昧",
  "真诚",
  "幽默",
  "严肃",
  "向上管理",
  "普通朋友",
  "委婉拒绝",
  "安抚对方情绪",
  "希望对方合作购买",
];

const MOCK_UPDATED_AT = "2026-01-01T00:00:00.000Z";

/** 浏览器开发模式（pnpm dev, 非 Tauri）下的降级数据 */
const DEV_FALLBACK_CONTACTS: WorkspaceContact[] = [
  {
    id: "zhang-san",
    name: "张三",
    attributeDefinition: "普通朋友 · 慢热 / 喜欢轻松表达 / 最近工作压力偏大",
    lastActive: "昨天",
    summary: "适合用真诚、轻松、不施压的方式推进对话。",
    skill: {
      manual_tags: ["普通朋友", "慢热", "真诚"],
      distilled_traits: [
        {
          key: "沟通策略",
          value: "先共情，再给选择空间。",
        },
      ],
      notes: "最近在准备转岗，回复时需要降低压迫感。",
      updated_at: MOCK_UPDATED_AT,
      distilled_md_path: "~/Library/Application Support/SocialCopilot/distill/zhang-san.md",
    },
  },
  {
    id: "manager-li",
    name: "李经理",
    attributeDefinition: "向上管理 · 目标导向 / 注重效率 / 喜欢结构化信息",
    lastActive: "10:31",
    summary: "适合用结论先行、风险明确、下一步清晰的表达。",
    skill: {
      manual_tags: ["向上管理", "结构化", "效率"],
      distilled_traits: [
        {
          key: "决策偏好",
          value: "先看结论，再看关键数据。",
        },
      ],
      notes: "沟通中减少铺垫，优先给判断和行动建议。",
      updated_at: MOCK_UPDATED_AT,
      distilled_md_path: "~/Library/Application Support/SocialCopilot/distill/manager-li.md",
    },
  },
  {
    id: "customer-wang",
    name: "王客户",
    attributeDefinition: "合作场景 · 谨慎 / 关注 ROI / 需要持续建立信任",
    lastActive: "周一",
    summary: "适合强调价值和确定性，不要过度催促。",
    skill: {
      manual_tags: ["客户", "ROI", "信任"],
      distilled_traits: [
        {
          key: "推进方式",
          value: "用案例和收益降低决策压力。",
        },
      ],
      notes: "上次重点关注投入产出比和团队落地成本。",
      updated_at: MOCK_UPDATED_AT,
      distilled_md_path: "~/Library/Application Support/SocialCopilot/distill/customer-wang.md",
    },
  },
];

const INITIAL_DRAFT: ComposerDraft = {
  incomingMessage: "",
  expectation: "",
};

function clampSuggestionCount(n: number | undefined): number {
  const v = n ?? 3;
  return Math.min(10, Math.max(3, Math.floor(v)));
}

const createInitialWorkspaceState = (): ContactWorkspaceState => ({
  draft: INITIAL_DRAFT,
  suggestions: [],
  suggestionCount: 3,
  suggestionStyleMode: "title",
  suggestionTextOverrides: {},
  error: null,
  peerMessageHistory: [],
});

function initialWorkspaceStatesForContacts(
  contactList: WorkspaceContact[],
  peerMap: Record<string, Message[]>,
): Record<string, ContactWorkspaceState> {
  return Object.fromEntries(
    contactList.map((contact) => {
      const state = createInitialWorkspaceState();
      return [
        contact.id,
        { ...state, peerMessageHistory: peerMap[contact.id] ?? state.peerMessageHistory },
      ];
    }),
  );
}

function isTauriEnv(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export default function Home() {
  const [contacts, setContacts] = useState<WorkspaceContact[]>(() =>
    isTauriEnv() ? [] : DEV_FALLBACK_CONTACTS,
  );
  const [isContactsLoading, setIsContactsLoading] = useState(() => isTauriEnv());
  const [selectedContactId, setSelectedContactId] = useState<string | undefined>(
    isTauriEnv() ? undefined : DEV_FALLBACK_CONTACTS[0]?.id,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [model, setModel] = useState("mock");
  const [workspaceStates, setWorkspaceStates] = useState<Record<string, ContactWorkspaceState>>(
    () =>
      isTauriEnv()
        ? {}
        : initialWorkspaceStatesForContacts(DEV_FALLBACK_CONTACTS, loadPeerMessagesMap()),
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedSuggestionId, setCopiedSuggestionId] = useState<string | null>(null);
  const [aiConfigOpen, setAiConfigOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState<AiProviderConfig | null>(null);

  // ── 启动时从磁盘加载联系人 ─────────────────────────────────────────────
  useEffect(() => {
    if (!isTauriEnv()) return;

    let cancelled = false;
    setIsContactsLoading(true);

    loadContacts()
      .then((persisted) => {
        if (cancelled) return;
        if (persisted.length > 0) {
          setContacts(persisted);
          setSelectedContactId(persisted[0].id);
          const peerMap = loadPeerMessagesMap();
          setWorkspaceStates(initialWorkspaceStatesForContacts(persisted, peerMap));
        } else {
          setContacts(DEV_FALLBACK_CONTACTS);
          setSelectedContactId(DEV_FALLBACK_CONTACTS[0]?.id);
          setWorkspaceStates(
            initialWorkspaceStatesForContacts(DEV_FALLBACK_CONTACTS, loadPeerMessagesMap()),
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("[loadContacts] 读取失败，使用内置数据：", err);
          setContacts(DEV_FALLBACK_CONTACTS);
          setSelectedContactId(DEV_FALLBACK_CONTACTS[0]?.id);
          setWorkspaceStates(
            initialWorkspaceStatesForContacts(DEV_FALLBACK_CONTACTS, loadPeerMessagesMap()),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsContactsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) ?? contacts[0],
    [contacts, selectedContactId],
  );

  const selectedWorkspaceState = selectedContact
    ? (workspaceStates[selectedContact.id] ?? createInitialWorkspaceState())
    : createInitialWorkspaceState();
  const {
    draft,
    suggestions,
    error,
    selectedSuggestionId,
    suggestionTextOverrides,
    peerMessageHistory,
  } = selectedWorkspaceState;
  const peerMessages = peerMessageHistory ?? [];
  const suggestionCount = clampSuggestionCount(selectedWorkspaceState.suggestionCount);
  const suggestionStyleMode: SuggestionStyleMode =
    selectedWorkspaceState.suggestionStyleMode ?? "title";
  const overrides = suggestionTextOverrides ?? {};

  const selectedSuggestion =
    suggestions.find((suggestion) => suggestion.id === selectedSuggestionId) ?? suggestions[0];

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((contact) =>
      [contact.name, contact.relation, contact.attributeDefinition]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [contacts, searchQuery]);

  const isMockModel = model === "mock";
  const sendDisabledReason = !selectedContact
    ? "请先选择联系人"
    : !draft.incomingMessage.trim()
      ? "请先粘贴联系人发送的内容"
      : "";
  const canSend = Boolean(!sendDisabledReason && !isGenerating);

  const createContact = (payload: { name: string; attributeDefinition: string }) => {
    const now = new Date().toISOString();
    const name = payload.name.trim();
    const attributeDefinition =
      payload.attributeDefinition.trim() || "待补充属性定义（可含关系、身份等语义）";

    const nextContact: WorkspaceContact = {
      id: `contact-${Date.now()}`,
      name,
      attributeDefinition,
      lastActive: "刚刚",
      skill: {
        manual_tags: [],
        distilled_traits: [],
        notes: "",
        updated_at: now,
      },
    };

    // Persist asynchronously; UI optimistically updates first
    saveContact(nextContact).catch((err) =>
      console.error("[createContact] 保存联系人失败：", err),
    );

    setContacts((prev) => [nextContact, ...prev]);
    setWorkspaceStates((prev) => ({
      ...prev,
      [nextContact.id]: createInitialWorkspaceState(),
    }));
    setSelectedContactId(nextContact.id);
  };

  const selectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setWorkspaceStates((prev) => {
      if (prev[contactId]) return prev;
      const peerMap = loadPeerMessagesMap();
      const initial = createInitialWorkspaceState();
      return {
        ...prev,
        [contactId]: {
          ...initial,
          peerMessageHistory: peerMap[contactId] ?? initial.peerMessageHistory,
        },
      };
    });
  };

  const handleContactSkillChange = (nextSkill: ContactSkill) => {
    if (!selectedContact) return;
    const updatedContact: WorkspaceContact = {
      ...selectedContact,
      skill: { ...nextSkill, updated_at: new Date().toISOString() },
    };
    setContacts((prev) => prev.map((c) => (c.id === updatedContact.id ? updatedContact : c)));
    saveContact(updatedContact).catch((err) =>
      console.error("[handleContactSkillChange] 保存失败：", err),
    );
  };

  const updateSelectedWorkspaceState = (
    updater: (state: ContactWorkspaceState) => ContactWorkspaceState,
  ) => {
    if (!selectedContact) return;
    setWorkspaceStates((prev) => {
      const current = prev[selectedContact.id] ?? createInitialWorkspaceState();
      return {
        ...prev,
        [selectedContact.id]: updater(current),
      };
    });
  };

  const updateDraft = (nextDraft: ComposerDraft) => {
    updateSelectedWorkspaceState((state) => ({
      ...state,
      draft: nextDraft,
    }));
  };

  const clearExpectation = () => {
    updateSelectedWorkspaceState((state) => ({
      ...state,
      draft: { ...state.draft, expectation: "" },
    }));
  };

  const setSuggestionCountForContact = (count: number) => {
    const next = clampSuggestionCount(count);
    updateSelectedWorkspaceState((state) => ({
      ...state,
      suggestionCount: next,
    }));
  };

  const setSuggestionStyleModeForContact = (mode: SuggestionStyleMode) => {
    updateSelectedWorkspaceState((state) => ({
      ...state,
      suggestionStyleMode: mode,
    }));
  };

  const setSuggestionBodyOverride = (suggestionId: string, text: string) => {
    updateSelectedWorkspaceState((state) => {
      const base = state.suggestions.find((s) => s.id === suggestionId);
      const nextOverrides = { ...(state.suggestionTextOverrides ?? {}) };
      if (!base) return state;
      if (text === base.text) {
        delete nextOverrides[suggestionId];
      } else {
        nextOverrides[suggestionId] = text;
      }
      return {
        ...state,
        suggestionTextOverrides: nextOverrides,
      };
    });
  };

  const appendPromptChip = (chip: string) => {
    updateSelectedWorkspaceState((state) => {
      const trimmed = state.draft.expectation.trim();
      if (trimmed.includes(chip)) return state;
      const expectation = !trimmed
        ? chip
        : `${state.draft.expectation}${state.draft.expectation.endsWith(" ") ? "" : " "}${chip}`;
      return {
        ...state,
        draft: {
          ...state.draft,
          expectation,
        },
      };
    });
  };

  const openAiConfig = async () => {
    try {
      const config = await getAiProviderConfig();
      setAiConfig(config);
    } catch (err) {
      updateSelectedWorkspaceState((state) => ({
        ...state,
        error: err instanceof Error ? err.message : "读取模型配置失败",
      }));
    } finally {
      setAiConfigOpen(true);
    }
  };

  const saveAiConfig = async (config: AiProviderConfig) => {
    await saveAiProviderConfig(config);
    setAiConfig(config);
    setModel("openai-compatible");
  };

  const sendToModel = async () => {
    if (!selectedContact || !canSend) {
      if (sendDisabledReason) {
        updateSelectedWorkspaceState((state) => ({
          ...state,
          error: sendDisabledReason,
        }));
      }
      return;
    }

    const count = suggestionCount;

    setIsGenerating(true);
    updateSelectedWorkspaceState((state) => ({ ...state, error: null }));

    const intent: Intent = {
      id: "workspace-expectation",
      label: draft.expectation.trim() || "本次交流预期",
      description: draft.expectation.trim(),
    };

    const history = selectedWorkspaceState.peerMessageHistory ?? [];
    const newPeerMessage: Message = {
      id: `peer-${Date.now()}`,
      sender: "peer",
      text: draft.incomingMessage.trim(),
      timestamp: new Date().toISOString(),
    };
    const recentMessages: Message[] = [...history, newPeerMessage];

    try {
      const request: AiSuggestionRequest = {
        model,
        suggestionCount: count,
        contact: selectedContact,
        draft,
        intent,
        recentMessages,
        workspaceContext: {
          source: "manual-paste",
          generatedAt: new Date().toISOString(),
        },
      };
      const result = isMockModel
        ? await generateMockSuggestions(request)
        : await requestAiSuggestions(request);
      const appended = [...history, newPeerMessage];
      updateSelectedWorkspaceState((state) => ({
        ...state,
        suggestions: result,
        selectedSuggestionId: result[0]?.id,
        suggestionTextOverrides: {},
        peerMessageHistory: appended,
        draft: { ...state.draft, incomingMessage: "" },
        error: null,
      }));
      persistPeerMessagesForContact(selectedContact.id, appended);
    } catch (err) {
      updateSelectedWorkspaceState((state) => ({
        ...state,
        error: err instanceof Error ? err.message : "生成失败，请重试",
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  const copySuggestionText = async (suggestionId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSuggestionId(suggestionId);
      window.setTimeout(() => setCopiedSuggestionId(null), 1600);
    } catch {
      updateSelectedWorkspaceState((state) => ({
        ...state,
        error: "当前环境无法访问剪贴板，请手动复制建议内容。",
      }));
    }
  };

  const selectSuggestionPreview = (suggestionId: string) => {
    updateSelectedWorkspaceState((state) => ({
      ...state,
      selectedSuggestionId: suggestionId,
    }));
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-muted/30">
      <WindowDragBar />
      <main className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)]">
        <ContactSidebar
          contacts={filteredContacts}
          selectedContactId={selectedContact?.id}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onCreateContact={createContact}
          onSelectContact={selectContact}
        />
        <ChatWorkspace
          contact={selectedContact}
          draft={draft}
          peerMessages={peerMessages}
          model={model}
          promptChips={PROMPT_CHIPS}
          isMockModel={isMockModel}
          isGenerating={isGenerating}
          canSend={canSend}
          sendDisabledReason={sendDisabledReason}
          error={error}
          suggestions={suggestions}
          selectedSuggestion={selectedSuggestion}
          suggestionTextOverrides={overrides}
          suggestionCount={suggestionCount}
          suggestionStyleMode={suggestionStyleMode}
          copiedSuggestionId={copiedSuggestionId}
          onSuggestionCountChange={setSuggestionCountForContact}
          onSuggestionStyleModeChange={setSuggestionStyleModeForContact}
          onSuggestionBodyChange={setSuggestionBodyOverride}
          onDraftChange={updateDraft}
          onModelChange={setModel}
          onPromptChipClick={appendPromptChip}
          onClearExpectation={clearExpectation}
          onSelectSuggestionPreview={selectSuggestionPreview}
          onOpenModelConfig={() => void openAiConfig()}
          onSend={() => void sendToModel()}
          onCopySuggestionText={(id, text) => void copySuggestionText(id, text)}
          onContactSkillChange={handleContactSkillChange}
        />
      </main>
      {aiConfigOpen ? (
        <AiConfigDialog
          open={aiConfigOpen}
          initialConfig={aiConfig}
          onClose={() => setAiConfigOpen(false)}
          onSave={saveAiConfig}
        />
      ) : null}
    </div>
  );
}
