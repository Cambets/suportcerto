import * as fs from "node:fs";
import * as path from "node:path";

export interface StoredUser {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "suporte" | "franchisee" | "client";
  is_active: boolean;
  needs_approval?: boolean;
  created_at: string;
  updated_at?: string;
}

const DEFAULT_USERS: StoredUser[] = [
  {
    id: "admin-master",
    email: "admin@certifica.com.br",
    full_name: "Administrador Master",
    role: "admin",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "suporte-fiscal",
    email: "suporte@certifica.com.br",
    full_name: "Equipe Suporte N2",
    role: "suporte",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "consultor-erp",
    email: "consultoria@certifica.com.br",
    full_name: "Consultor Técnico ERP",
    role: "franchisee",
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

function getStoreFilePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", ".local_users.json");
  }
  return path.resolve(process.cwd(), ".local_users.json");
}

const memoryUsers = new Map<string, StoredUser>();
let isLoaded = false;

function loadStore(): Record<string, StoredUser> {
  const filePath = getStoreFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
        memoryUsers.clear();
        for (const [k, v] of Object.entries(parsed)) {
          memoryUsers.set(k, v as StoredUser);
        }
        isLoaded = true;
        return parsed;
      }
    }
  } catch (err) {
    console.error("[users.store] Erro ao ler store local:", err);
  }

  // Prepopulate default users if empty
  if (memoryUsers.size === 0) {
    for (const u of DEFAULT_USERS) {
      memoryUsers.set(u.id, u);
    }
    persistStore();
  }

  isLoaded = true;
  return Object.fromEntries(memoryUsers.entries());
}

function persistStore() {
  const filePath = getStoreFilePath();
  try {
    const data = Object.fromEntries(memoryUsers.entries());
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[users.store] Erro ao persistir store local:", err);
  }
}

function ensureLoaded() {
  if (!isLoaded) {
    loadStore();
  }
}

export function getLocalUsers(): StoredUser[] {
  ensureLoaded();
  return Array.from(memoryUsers.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function saveLocalUser(user: Partial<StoredUser> & { email: string; full_name: string }): StoredUser {
  ensureLoaded();
  const id = user.id || "usr-" + Math.random().toString(36).substring(2, 10);
  const existing = memoryUsers.get(id);

  const saved: StoredUser = {
    id,
    email: user.email.trim().toLowerCase(),
    full_name: user.full_name.trim(),
    role: user.role || existing?.role || "client",
    is_active: user.is_active !== undefined ? user.is_active : existing?.is_active ?? true,
    needs_approval: user.needs_approval !== undefined ? user.needs_approval : existing?.needs_approval ?? false,
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memoryUsers.set(id, saved);
  persistStore();
  return saved;
}

export function updateLocalUserRole(id: string, role: "admin" | "suporte" | "franchisee" | "client"): boolean {
  ensureLoaded();
  const existing = memoryUsers.get(id);
  if (!existing) return false;
  existing.role = role;
  existing.updated_at = new Date().toISOString();
  memoryUsers.set(id, existing);
  persistStore();
  return true;
}

export function toggleLocalUserActive(id: string, isActive: boolean): boolean {
  ensureLoaded();
  const existing = memoryUsers.get(id);
  if (!existing) return false;
  existing.is_active = isActive;
  existing.updated_at = new Date().toISOString();
  memoryUsers.set(id, existing);
  persistStore();
  return true;
}

export function deleteLocalUser(id: string): boolean {
  ensureLoaded();
  const deleted = memoryUsers.delete(id);
  if (deleted) {
    persistStore();
  }
  return deleted;
}
