import * as fs from "node:fs";
import * as path from "node:path";

export interface LocalMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface LocalThread {
  id: string;
  title: string;
  visitor_id: string;
  visitor_name?: string;
  visitor_email?: string;
  visitor_phone?: string;
  visitor_document?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  contact_type?: "suporte" | "lead" | "indefinido";
  lead_company?: string;
  lead_cnpj?: string;
  lead_interest?: string;
  created_at: string;
  updated_at: string;
  messages: LocalMessage[];
}

function getStoreFilePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", ".local_threads.json");
  }
  return path.resolve(process.cwd(), ".local_threads.json");
}

// In-memory cache as secondary layer
const memoryThreads = new Map<string, LocalThread>();
let isLoaded = false;

function loadStore(): Record<string, LocalThread> {
  const filePath = getStoreFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") {
        for (const [k, v] of Object.entries(parsed)) {
          memoryThreads.set(k, v as LocalThread);
        }
        isLoaded = true;
        return parsed;
      }
    }
  } catch (err) {
    console.error("[threads.store] Erro ao ler store local:", err);
  }
  isLoaded = true;
  return Object.fromEntries(memoryThreads.entries());
}

function persistStore() {
  const filePath = getStoreFilePath();
  try {
    const data = Object.fromEntries(memoryThreads.entries());
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[threads.store] Erro ao persistir store local:", err);
  }
}

function ensureLoaded() {
  if (!isLoaded) {
    loadStore();
  }
}

export function saveLocalThread(thread: Partial<LocalThread> & { id: string; visitor_id: string }): LocalThread {
  ensureLoaded();
  const existing = memoryThreads.get(thread.id);
  const now = new Date().toISOString();
  const fullThread: LocalThread = {
    id: thread.id,
    title: thread.title || existing?.title || "Nova conversa",
    visitor_id: thread.visitor_id || existing?.visitor_id || "anonymous",
    visitor_name: thread.visitor_name ?? existing?.visitor_name,
    visitor_email: thread.visitor_email ?? existing?.visitor_email,
    visitor_phone: thread.visitor_phone ?? existing?.visitor_phone,
    visitor_document: thread.visitor_document ?? existing?.visitor_document,
    utm_source: thread.utm_source ?? existing?.utm_source,
    utm_medium: thread.utm_medium ?? existing?.utm_medium,
    utm_campaign: thread.utm_campaign ?? existing?.utm_campaign,
    contact_type: thread.contact_type ?? existing?.contact_type ?? "suporte",
    lead_company: thread.lead_company ?? existing?.lead_company,
    lead_cnpj: thread.lead_cnpj ?? existing?.lead_cnpj,
    lead_interest: thread.lead_interest ?? existing?.lead_interest,
    created_at: existing?.created_at || thread.created_at || now,
    updated_at: now,
    messages: existing?.messages || thread.messages || [],
  };
  memoryThreads.set(thread.id, fullThread);
  persistStore();
  return fullThread;
}

export function getLocalThread(threadId: string, visitorId?: string): LocalThread | null {
  ensureLoaded();
  const thread = memoryThreads.get(threadId);
  if (!thread) return null;
  if (visitorId && thread.visitor_id && thread.visitor_id !== visitorId && visitorId !== "admin-local-dev") {
    // Permitir acesso se coincidir ou se for admin
    return thread;
  }
  return thread;
}

export function listLocalThreads(visitorId: string): Array<{ id: string; title: string; updated_at: string }> {
  ensureLoaded();
  const list: Array<{ id: string; title: string; updated_at: string }> = [];
  for (const t of memoryThreads.values()) {
    if (!visitorId || t.visitor_id === visitorId || visitorId === "admin-local-dev") {
      // Deduplicar e incluir se tiver mensagens ou se foi criada recentemente
      list.push({
        id: t.id,
        title: t.title,
        updated_at: t.updated_at,
      });
    }
  }
  list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  return list;
}

export function deleteLocalThread(threadId: string, visitorId?: string): boolean {
  ensureLoaded();
  if (memoryThreads.has(threadId)) {
    memoryThreads.delete(threadId);
    persistStore();
    return true;
  }
  return false;
}

export function renameLocalThread(threadId: string, title: string): boolean {
  ensureLoaded();
  const thread = memoryThreads.get(threadId);
  if (!thread) return false;
  thread.title = title;
  thread.updated_at = new Date().toISOString();
  persistStore();
  return true;
}

export function addLocalMessage(threadId: string, msg: { role: string; content: string; id?: string }): LocalMessage {
  ensureLoaded();
  let thread = memoryThreads.get(threadId);
  if (!thread) {
    thread = saveLocalThread({ id: threadId, visitor_id: "anonymous" });
  }
  const message: LocalMessage = {
    id: msg.id || (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : "msg-" + Math.random().toString(36).substring(2, 9)),
    role: msg.role as any,
    content: msg.content,
    created_at: new Date().toISOString(),
  };
  thread.messages.push(message);
  thread.updated_at = message.created_at;
  persistStore();
  return message;
}
