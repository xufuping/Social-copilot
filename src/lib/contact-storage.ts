import { invoke } from "@tauri-apps/api/core";
import type { WorkspaceContact } from "@/lib/types";

function isTauriEnv(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function loadContacts(): Promise<WorkspaceContact[]> {
  if (!isTauriEnv()) return [];
  return invoke<WorkspaceContact[]>("load_contacts");
}

export async function saveContact(contact: WorkspaceContact): Promise<string> {
  if (!isTauriEnv()) return "";
  return invoke<string>("save_contact", { contact });
}

export async function deleteContact(contactId: string): Promise<void> {
  if (!isTauriEnv()) return;
  return invoke<void>("delete_contact", { contactId });
}

export async function sanitizeContactName(name: string): Promise<string> {
  if (!isTauriEnv()) return name;
  return invoke<string>("sanitize_contact_name", { name });
}

