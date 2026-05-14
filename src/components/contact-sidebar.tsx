"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WorkspaceContact } from "@/lib/types";

interface ContactSidebarProps {
  contacts: WorkspaceContact[];
  selectedContactId?: string;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onCreateContact: (payload: { name: string; attributeDefinition: string }) => void;
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
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAttribute, setNewAttribute] = useState("");

  const openNewDialog = () => {
    setNewName("");
    setNewAttribute("");
    setNewDialogOpen(true);
  };

  const submitNewContact = () => {
    const name = newName.trim();
    if (!name) return;
    onCreateContact({
      name,
      attributeDefinition: newAttribute.trim(),
    });
    setNewDialogOpen(false);
  };

  return (
    <aside className="flex min-h-0 flex-col border-r bg-sidebar">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className="shrink-0 text-sm font-semibold">联系人</span>
        <div className="relative min-w-0 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="搜索"
            className="h-8 pl-8 text-sm"
            aria-label="搜索联系人"
          />
        </div>
        <Button
          type="button"
          size="icon-sm"
          className="shrink-0"
          onClick={openNewDialog}
          aria-label="新建联系人"
          title="新建联系人 — 每个新联系人会独享一个聊天对话上下文"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {contacts.length === 0 ? (
          <div className="rounded-lg border border-dashed px-3 py-8 text-center text-xs text-muted-foreground">
            <p className="mb-3 font-medium text-foreground">创建第一个联系人</p>
            <p className="mb-4">添加聊天对象后，即可在右侧粘贴消息并获取 AI 建议。</p>
            <Button type="button" size="sm" variant="secondary" onClick={openNewDialog}>
              新建联系人
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {contacts.map((contact) => {
              const selected = contact.id === selectedContactId;
              const attrLine = contact.attributeDefinition.trim() || "（未填写属性定义）";
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
                  <div className="mt-1 truncate text-xs text-muted-foreground">{attrLine}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {newDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={() => setNewDialogOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-contact-title"
            className="w-full max-w-md rounded-xl border bg-card p-4 shadow-lg"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") setNewDialogOpen(false);
            }}
          >
            <h2 id="new-contact-title" className="text-sm font-semibold">
              新建联系人
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              每个新联系人会独享一个聊天对话上下文
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label htmlFor="new-contact-name" className="mb-1 block text-xs font-medium">
                  昵称
                </label>
                <Input
                  id="new-contact-name"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="例如：张三"
                  className="text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="new-contact-attr" className="mb-1 block text-xs font-medium">
                  属性定义
                </label>
                <textarea
                  id="new-contact-attr"
                  value={newAttribute}
                  onChange={(event) => setNewAttribute(event.target.value)}
                  placeholder="例如：普通朋友、慢热、最近工作压力大…（关系与身份语义写在这里即可）"
                  className="border-input bg-background ring-ring/50 flex min-h-[5rem] w-full rounded-lg border px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewDialogOpen(false)}>
                取消
              </Button>
              <Button type="button" size="sm" onClick={submitNewContact} disabled={!newName.trim()}>
                创建
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
