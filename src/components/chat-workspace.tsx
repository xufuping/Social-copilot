import { ComposerPanel } from "@/components/composer-panel";
import { ContactHeader } from "@/components/contact-header";
import { ConversationArea } from "@/components/conversation-area";
import type { ComposerDraft, Suggestion, WorkspaceContact } from "@/lib/types";

interface ChatWorkspaceProps {
  contact?: WorkspaceContact;
  draft: ComposerDraft;
  model: string;
  promptChips: string[];
  isMockModel: boolean;
  isGenerating: boolean;
  canSend: boolean;
  sendDisabledReason: string;
  error: string | null;
  suggestions: Suggestion[];
  selectedSuggestion?: Suggestion;
  copiedSuggestionId: string | null;
  onDraftChange: (nextDraft: ComposerDraft) => void;
  onModelChange: (model: string) => void;
  onPromptChipClick: (chip: string) => void;
  onSelectSuggestionPreview: (suggestionId: string) => void;
  onOpenModelConfig: () => void;
  onSend: () => void;
  onCopySuggestion: (suggestion: Suggestion) => void;
}

export function ChatWorkspace({
  contact,
  draft,
  model,
  promptChips,
  isMockModel,
  isGenerating,
  canSend,
  sendDisabledReason,
  error,
  suggestions,
  selectedSuggestion,
  copiedSuggestionId,
  onDraftChange,
  onModelChange,
  onPromptChipClick,
  onSelectSuggestionPreview,
  onOpenModelConfig,
  onSend,
  onCopySuggestion,
}: ChatWorkspaceProps) {
  return (
    <section className="flex min-h-0 flex-col bg-background">
      {contact ? (
        <>
          <ContactHeader contact={contact} />
          <ConversationArea
            draft={draft}
            isMockModel={isMockModel}
            error={error}
            isGenerating={isGenerating}
            suggestions={suggestions}
            selectedSuggestion={selectedSuggestion}
            copiedSuggestionId={copiedSuggestionId}
            onSelectSuggestionPreview={onSelectSuggestionPreview}
            onCopySuggestion={onCopySuggestion}
          />
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
