"use client";

import { useMemo, useState } from "react";
import { AiConfigDialog } from "@/components/ai-config-dialog";
import { ChatWorkspace } from "@/components/chat-workspace";
import { ContactSidebar } from "@/components/contact-sidebar";
import { WindowDragBar } from "@/components/window-drag-bar";
import { getAiProviderConfig, requestAiSuggestions, saveAiProviderConfig } from "@/lib/ai";
import { generateMockSuggestions } from "@/lib/mock";
import type {
  AiSuggestionRequest,
  AiProviderConfig,
  ComposerDraft,
  ContactWorkspaceState,
  Intent,
  Message,
  Suggestion,
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

const INITIAL_CONTACTS: WorkspaceContact[] = [
  {
    id: "zhang-san",
    name: "张三",
    relation: "普通朋友",
    attributeDefinition: "慢热 / 喜欢轻松表达 / 最近工作压力偏大",
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
    },
  },
  {
    id: "manager-li",
    name: "李经理",
    relation: "向上管理",
    attributeDefinition: "目标导向 / 注重效率 / 喜欢结构化信息",
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
    },
  },
  {
    id: "customer-wang",
    name: "王客户",
    relation: "合作购买",
    attributeDefinition: "谨慎 / 关注 ROI / 需要持续建立信任",
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
    },
  },
];

const INITIAL_DRAFT: ComposerDraft = {
  incomingMessage: "",
  expectation: "",
};

const createInitialWorkspaceState = (): ContactWorkspaceState => ({
  draft: INITIAL_DRAFT,
  suggestions: [],
  error: null,
});

export default function Home() {
  const [contacts, setContacts] = useState<WorkspaceContact[]>(INITIAL_CONTACTS);
  const [selectedContactId, setSelectedContactId] = useState(INITIAL_CONTACTS[0].id);
  const [searchQuery, setSearchQuery] = useState("");
  const [model, setModel] = useState("mock");
  const [workspaceStates, setWorkspaceStates] = useState<Record<string, ContactWorkspaceState>>(
    () =>
      Object.fromEntries(
        INITIAL_CONTACTS.map((contact) => [contact.id, createInitialWorkspaceState()]),
      ),
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedSuggestionId, setCopiedSuggestionId] = useState<string | null>(null);
  const [aiConfigOpen, setAiConfigOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState<AiProviderConfig | null>(null);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) ?? contacts[0],
    [contacts, selectedContactId],
  );

  const selectedWorkspaceState = selectedContact
    ? (workspaceStates[selectedContact.id] ?? createInitialWorkspaceState())
    : createInitialWorkspaceState();
  const { draft, suggestions, error, selectedSuggestionId } = selectedWorkspaceState;
  const selectedSuggestion =
    suggestions.find((suggestion) => suggestion.id === selectedSuggestionId) ?? suggestions[0];

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((contact) =>
      [contact.name, contact.relation, contact.attributeDefinition]
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

  const addContact = () => {
    const name = window.prompt("输入联系人名称");
    const trimmedName = name?.trim();
    if (!trimmedName) return;

    const now = new Date().toISOString();
    const nextContact: WorkspaceContact = {
      id: `contact-${Date.now()}`,
      name: trimmedName,
      relation: "未定义关系",
      attributeDefinition: "点击后续版本补充联系人属性定义",
      lastActive: "刚刚",
      summary: "新联系人，等待沉淀沟通偏好。",
      skill: {
        manual_tags: ["新联系人"],
        distilled_traits: [],
        notes: "",
        updated_at: now,
      },
    };

    setContacts((prev) => [nextContact, ...prev]);
    setWorkspaceStates((prev) => ({
      ...prev,
      [nextContact.id]: createInitialWorkspaceState(),
    }));
    setSelectedContactId(nextContact.id);
  };

  const selectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setWorkspaceStates((prev) =>
      prev[contactId]
        ? prev
        : {
            ...prev,
            [contactId]: createInitialWorkspaceState(),
          },
    );
  };

  const updateSelectedWorkspaceState = (updater: (state: ContactWorkspaceState) => ContactWorkspaceState) => {
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

    setIsGenerating(true);
    updateSelectedWorkspaceState((state) => ({ ...state, error: null }));

    const intent: Intent = {
      id: "workspace-expectation",
      label: draft.expectation.trim() || "本次交流预期",
      description: draft.expectation.trim(),
    };

    const recentMessages: Message[] = [
      {
        id: `incoming-${Date.now()}`,
        sender: "peer",
        text: draft.incomingMessage,
        timestamp: new Date().toISOString(),
      },
    ];

    try {
      const request: AiSuggestionRequest = {
        model,
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
      updateSelectedWorkspaceState((state) => ({
        ...state,
        suggestions: result,
        selectedSuggestionId: result[0]?.id,
        error: null,
      }));
    } catch (err) {
      updateSelectedWorkspaceState((state) => ({
        ...state,
        error: err instanceof Error ? err.message : "生成失败，请重试",
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  const copySuggestion = async (suggestion: Suggestion) => {
    try {
      await navigator.clipboard.writeText(suggestion.text);
      setCopiedSuggestionId(suggestion.id);
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
          onCreateContact={addContact}
          onSelectContact={selectContact}
        />
        <ChatWorkspace
          contact={selectedContact}
          draft={draft}
          model={model}
          promptChips={PROMPT_CHIPS}
          isMockModel={isMockModel}
          isGenerating={isGenerating}
          canSend={canSend}
          sendDisabledReason={sendDisabledReason}
          error={error}
          suggestions={suggestions}
          selectedSuggestion={selectedSuggestion}
          copiedSuggestionId={copiedSuggestionId}
          onDraftChange={updateDraft}
          onModelChange={setModel}
          onPromptChipClick={appendPromptChip}
          onSelectSuggestionPreview={selectSuggestionPreview}
          onOpenModelConfig={() => void openAiConfig()}
          onSend={() => void sendToModel()}
          onCopySuggestion={(suggestion) => void copySuggestion(suggestion)}
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
