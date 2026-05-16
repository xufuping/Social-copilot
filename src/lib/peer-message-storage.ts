import type { Message } from "@/lib/types";

const STORAGE_KEY = "social-copilot-peer-messages-v1";

export function loadPeerMessagesMap(): Record<string, Message[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, Message[]>;
  } catch {
    return {};
  }
}

export function savePeerMessagesMap(map: Record<string, Message[]>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode
  }
}

export function persistPeerMessagesForContact(
  contactId: string,
  messages: Message[],
  previousMap?: Record<string, Message[]>,
): void {
  const base = previousMap ?? loadPeerMessagesMap();
  savePeerMessagesMap({ ...base, [contactId]: messages });
}

export function clearPeerMessagesForContacts(contactIds: string[]): void {
  if (contactIds.length === 0) return;
  const base = loadPeerMessagesMap();
  let changed = false;
  for (const id of contactIds) {
    if (id in base) {
      delete base[id];
      changed = true;
    }
  }
  if (changed) savePeerMessagesMap(base);
}
