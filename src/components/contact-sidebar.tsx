"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  onUpdateContact: (
    contactId: string,
    payload: { name: string; attributeDefinition: string },
  ) => void;
  onDeleteContacts: (contactIds: string[]) => void;
  onSelectContact: (contactId: string) => void;
}

type DialogMode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; contactId: string };

interface ContextMenuState {
  contactId: string;
  x: number;
  y: number;
}

type ConfirmState =
  | { kind: "closed" }
  | { kind: "single"; contactId: string }
  | { kind: "multi"; contactIds: string[] };

export function ContactSidebar({
  contacts,
  selectedContactId,
  searchQuery,
  onSearchQueryChange,
  onCreateContact,
  onUpdateContact,
  onDeleteContacts,
  onSelectContact,
}: ContactSidebarProps) {
  const [dialogMode, setDialogMode] = useState<DialogMode>({ kind: "closed" });
  const [formName, setFormName] = useState("");
  const [formAttribute, setFormAttribute] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>({ kind: "closed" });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isEditing = dialogMode.kind === "edit";
  const dialogOpen = dialogMode.kind !== "closed";
  const confirmOpen = confirmState.kind !== "closed";

  const openNewDialog = () => {
    setFormName("");
    setFormAttribute("");
    setDialogMode({ kind: "create" });
  };

  const openEditDialog = (contact: WorkspaceContact) => {
    setFormName(contact.name);
    setFormAttribute(contact.attributeDefinition ?? "");
    setDialogMode({ kind: "edit", contactId: contact.id });
  };

  const closeDialog = () => setDialogMode({ kind: "closed" });

  const submitDialog = () => {
    const name = formName.trim();
    if (!name) return;
    const attributeDefinition = formAttribute.trim();
    if (dialogMode.kind === "create") {
      onCreateContact({ name, attributeDefinition });
    } else if (dialogMode.kind === "edit") {
      onUpdateContact(dialogMode.contactId, { name, attributeDefinition });
    }
    closeDialog();
  };

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(event.target as Node)) return;
      setContextMenu(null);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setContextMenu(null);
    };
    const handleScroll = () => setContextMenu(null);
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [contextMenu]);

  const enterSelectionMode = (seedId?: string) => {
    setSelectionMode(true);
    setSelectedIds(seedId ? new Set([seedId]) : new Set());
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelected = (contactId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  };

  const handleContextMenu = (
    event: React.MouseEvent<HTMLDivElement>,
    contact: WorkspaceContact,
  ) => {
    event.preventDefault();
    if (selectionMode) return;
    onSelectContact(contact.id);
    setContextMenu({ contactId: contact.id, x: event.clientX, y: event.clientY });
  };

  const handleRowClick = (contact: WorkspaceContact) => {
    if (selectionMode) {
      toggleSelected(contact.id);
    } else {
      onSelectContact(contact.id);
    }
  };

  const contextContact = contextMenu
    ? contacts.find((c) => c.id === contextMenu.contactId)
    : null;

  const confirmTargets = useMemo(() => {
    if (confirmState.kind === "single") {
      const c = contacts.find((x) => x.id === confirmState.contactId);
      return c ? [c] : [];
    }
    if (confirmState.kind === "multi") {
      return contacts.filter((c) => confirmState.contactIds.includes(c.id));
    }
    return [];
  }, [confirmState, contacts]);

  const performDelete = () => {
    if (confirmState.kind === "single") {
      onDeleteContacts([confirmState.contactId]);
    } else if (confirmState.kind === "multi") {
      onDeleteContacts(confirmState.contactIds);
      exitSelectionMode();
    }
    setConfirmState({ kind: "closed" });
  };

  const dialogTitle = isEditing ? "修改联系人" : "新建联系人";
  const dialogDescription = isEditing
    ? "更新该联系人的昵称或属性定义，聊天上下文将保留。"
    : "每个新联系人会独享一个聊天对话上下文";
  const submitLabel = isEditing ? "保存" : "创建";

  const confirmIsMulti = confirmState.kind === "multi";
  const confirmCount = confirmTargets.length;
  const confirmTitle = confirmIsMulti
    ? `删除 ${confirmCount} 个联系人？`
    : "删除联系人？";

  return (
    <aside className="flex min-h-0 flex-col border-r bg-sidebar">
      {selectionMode ? (
        <div className="flex flex-col gap-2 border-b bg-background/60 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm font-semibold">
              已选 {selectedIds.size}
            </span>
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
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={exitSelectionMode}>
              取消
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={selectedIds.size === 0}
              onClick={() =>
                setConfirmState({ kind: "multi", contactIds: Array.from(selectedIds) })
              }
            >
              删除{selectedIds.size > 0 ? `（${selectedIds.size}）` : ""}
            </Button>
          </div>
        </div>
      ) : (
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
      )}

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
              const checked = selectedIds.has(contact.id);
              const attrLine = contact.attributeDefinition.trim() || "";
              const baseClass =
                "flex items-start gap-2 rounded-xl border px-3 py-2 text-left transition cursor-pointer ";
              const stateClass = selectionMode
                ? checked
                  ? "border-primary/40 bg-primary/5"
                  : "border-transparent hover:bg-background/70"
                : selected
                  ? "border-primary/20 bg-background shadow-sm"
                  : "border-transparent hover:bg-background/70";
              return (
                <div
                  key={contact.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleRowClick(contact)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleRowClick(contact);
                    }
                  }}
                  onContextMenu={(event) => handleContextMenu(event, contact)}
                  className={baseClass + stateClass}
                >
                  {selectionMode ? (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelected(contact.id)}
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`选择 ${contact.name}`}
                      className="mt-0.5 size-4 shrink-0 accent-primary"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 truncate text-sm font-medium">{contact.name}</div>
                      <div className="shrink-0 text-[10px] text-muted-foreground">
                        {contact.lastActive}
                      </div>
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{attrLine}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {contextMenu && contextContact ? (
        <div
          ref={menuRef}
          role="menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 min-w-[160px] rounded-md border bg-popover py-1 text-sm shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              const target = contextContact;
              setContextMenu(null);
              openEditDialog(target);
            }}
          >
            修改
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-destructive hover:bg-destructive/10"
            onClick={() => {
              setContextMenu(null);
              setConfirmState({ kind: "single", contactId: contextContact.id });
            }}
          >
            删除
          </button>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              const seed = contextContact.id;
              setContextMenu(null);
              enterSelectionMode(seed);
            }}
          >
            批量删除
          </button>
        </div>
      ) : null}

      {dialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={closeDialog}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-dialog-title"
            className="w-full max-w-md rounded-xl border bg-card p-4 shadow-lg"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") closeDialog();
            }}
          >
            <h2 id="contact-dialog-title" className="text-sm font-semibold">
              {dialogTitle}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{dialogDescription}</p>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label htmlFor="contact-dialog-name" className="mb-1 block text-xs font-medium">
                  昵称
                </label>
                <Input
                  id="contact-dialog-name"
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  placeholder="例如：张三"
                  className="text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="contact-dialog-attr" className="mb-1 block text-xs font-medium">
                  属性定义
                </label>
                <textarea
                  id="contact-dialog-attr"
                  value={formAttribute}
                  onChange={(event) => setFormAttribute(event.target.value)}
                  placeholder="例如：普通朋友、慢热、最近工作压力大…（关系与身份语义写在这里即可）"
                  className="border-input bg-background ring-ring/50 flex min-h-[5rem] w-full rounded-lg border px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={closeDialog}>
                取消
              </Button>
              <Button type="button" size="sm" onClick={submitDialog} disabled={!formName.trim()}>
                {submitLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={() => setConfirmState({ kind: "closed" })}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="contact-confirm-title"
            className="w-full max-w-sm rounded-xl border bg-card p-4 shadow-lg"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") setConfirmState({ kind: "closed" });
            }}
          >
            <h2 id="contact-confirm-title" className="text-sm font-semibold text-destructive">
              {confirmTitle}
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              此操作将清空这
              {confirmIsMulti ? ` ${confirmCount} 个 ` : "个"}
              联系人的所有本地记录，包括属性定义、聊天上下文与建议历史，且无法恢复。
            </p>
            {confirmTargets.length > 0 ? (
              <div className="mt-3 max-h-32 overflow-y-auto rounded-md border bg-muted/40 p-2 text-xs">
                {confirmTargets.map((c) => (
                  <div key={c.id} className="truncate py-0.5">
                    {c.name}
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmState({ kind: "closed" })}
              >
                取消
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={performDelete}
                disabled={confirmTargets.length === 0}
              >
                确认删除
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
