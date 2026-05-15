import { ComposerPanel } from "@/components/composer-panel";
import { ConversationArea } from "@/components/conversation-area";
import { ProfilePanel } from "@/components/profile-panel";
import type {
  ComposerDraft,
  ContactSkill,
  Message,
  Suggestion,
  SuggestionStyleMode,
  WorkspaceContact,
} from "@/lib/types";

interface ChatWorkspaceProps {
  contact?: WorkspaceContact;
  draft: ComposerDraft;
  peerMessages: Message[];
  model: string;
  promptChips: string[];
  isMockModel: boolean;
  isGenerating: boolean;
  canSend: boolean;
  sendDisabledReason: string;
  error: string | null;
  suggestions: Suggestion[];
  selectedSuggestion?: Suggestion;
  suggestionTextOverrides: Record<string, string>;
  suggestionCount: number;
  suggestionStyleMode: SuggestionStyleMode;
  copiedSuggestionId: string | null;
  onSuggestionCountChange: (count: number) => void;
  onSuggestionStyleModeChange: (mode: SuggestionStyleMode) => void;
  onSuggestionBodyChange: (suggestionId: string, text: string) => void;
  onDraftChange: (nextDraft: ComposerDraft) => void;
  onModelChange: (model: string) => void;
  onPromptChipClick: (chip: string) => void;
  onClearExpectation: () => void;
  onSelectSuggestionPreview: (suggestionId: string) => void;
  onOpenModelConfig: () => void;
  onSend: () => void;
  onCopySuggestionText: (suggestionId: string, text: string) => void;
  onContactSkillChange?: (nextSkill: ContactSkill) => void;
}

export function ChatWorkspace({
  contact,
  draft,
  peerMessages,
  model,
  promptChips,
  isMockModel,
  isGenerating,
  canSend,
  sendDisabledReason,
  error,
  suggestions,
  selectedSuggestion,
  suggestionTextOverrides,
  suggestionCount,
  suggestionStyleMode,
  copiedSuggestionId,
  onSuggestionCountChange,
  onSuggestionStyleModeChange,
  onSuggestionBodyChange,
  onDraftChange,
  onModelChange,
  onPromptChipClick,
  onClearExpectation,
  onSelectSuggestionPreview,
  onOpenModelConfig,
  onSend,
  onCopySuggestionText,
  onContactSkillChange,
}: ChatWorkspaceProps) {
  return (
    <section className="flex min-h-0 flex-col bg-background">
      {contact ? (
        <>
          <ConversationArea
            contact={contact}
            draft={draft}
            peerMessages={peerMessages}
            isMockModel={isMockModel}
            error={error}
            isGenerating={isGenerating}
            suggestions={suggestions}
            selectedSuggestion={selectedSuggestion}
            suggestionTextOverrides={suggestionTextOverrides}
            suggestionCount={suggestionCount}
            suggestionStyleMode={suggestionStyleMode}
            copiedSuggestionId={copiedSuggestionId}
            onSuggestionCountChange={onSuggestionCountChange}
            onSuggestionStyleModeChange={onSuggestionStyleModeChange}
            onSuggestionBodyChange={onSuggestionBodyChange}
            onSelectSuggestionPreview={onSelectSuggestionPreview}
            onCopySuggestionText={onCopySuggestionText}
          />
          {onContactSkillChange && contact.skill && (
            <ProfilePanel skill={contact.skill} onChange={onContactSkillChange} />
          )}
          <ComposerPanel
            draft={draft}
            model={model}
            promptChips={promptChips}
            isGenerating={isGenerating}
            canSend={canSend}
            sendDisabledReason={sendDisabledReason}
            onDraftChange={onDraftChange}
            onModelChange={onModelChange}
            onPromptChipClick={onPromptChipClick}
            onClearExpectation={onClearExpectation}
            onOpenModelConfig={onOpenModelConfig}
            onSend={onSend}
          />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          从左侧创建或选择联系人
        </div>
      )}
    </section>
  );
}
