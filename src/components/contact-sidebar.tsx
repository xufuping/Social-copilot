import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WorkspaceContact } from "@/lib/types";

interface ContactSidebarProps {
  contacts: WorkspaceContact[];
  selectedContactId?: string;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onCreateContact: () => void;
  onSelectContact: (contactId: string) => void;
}

export function ContactSidebar({
  contacts,
  selectedContactId,
  searchQuery,
  onSearchQueryChange,
  onCreateContact,
  onSelectContact,
}: ContactSidebarProps) {
  return (
    <aside className="flex min-h-0 flex-col border-r bg-sidebar">
      <div className="border-b px-4 py-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-sm font-semibold">联系人</h1>
            <p className="text-xs text-muted-foreground">选择一个聊天对象开始辅助回复</p>
          </div>
          <Button type="button" size="icon-sm" onClick={onCreateContact} aria-label="新建联系人">
            <Plus className="size-4" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="搜索联系人"
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {contacts.length === 0 ? (
          <div className="rounded-lg border border-dashed px-3 py-8 text-center text-xs text-muted-foreground">
            没有找到联系人
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {contacts.map((contact) => {
              const selected = contact.id === selectedContactId;
              const tags = contact.skill.manual_tags.slice(0, 2).join(" · ");
              const meta = [contact.relation, tags].filter(Boolean).join(" · ");
              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => onSelectContact(contact.id)}
                  className={
                    "rounded-xl border px-3 py-2 text-left transition " +
                    (selected
                      ? "border-primary/20 bg-background shadow-sm"
                      : "border-transparent hover:bg-background/70")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate text-sm font-medium">{contact.name}</div>
                    <div className="shrink-0 text-[10px] text-muted-foreground">
                      {contact.lastActive}
                    </div>
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {meta || contact.summary}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
