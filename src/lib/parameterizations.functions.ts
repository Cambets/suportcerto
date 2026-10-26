import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isSupabaseAdminConfigured } from "@/integrations/supabase/client.server";
import * as fs from "node:fs";
import * as path from "node:path";

function getLocalDbPath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", ".local_parameterizations.json");
  }
  return path.resolve(process.cwd(), ".local_parameterizations.json");
}

let inMemoryStore: any[] | null = null;

function getLocalStore(): any[] {
  if (inMemoryStore !== null) return inMemoryStore;
  const filePath = getLocalDbPath();
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      inMemoryStore = JSON.parse(data) || [];
      return inMemoryStore || [];
    }
  } catch (e) {
    console.error("Local store read error:", e);
  }
  inMemoryStore = [];
  return inMemoryStore;
}

function saveLocalStore(items: any[]) {
  inMemoryStore = items;
  const filePath = getLocalDbPath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), "utf-8");
  } catch (e) {
    console.error("Local store write error:", e);
  }
}

async function assertAdmin(userId: string) {
  if (!isSupabaseAdminConfigured() || userId === "admin-local-dev") return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "suporte"])
      .maybeSingle();

    if (!data) {
      const { count } = await supabaseAdmin.from("user_roles").select("*", { count: "exact", head: true });
      if (count === 0 || count === null) {
        await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
      }
    }
  } catch {
    // Modo local / dev ativo
  }
}

export const listParameterizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context?.userId || "admin-local-dev";
    await assertAdmin(userId);
    if (isSupabaseAdminConfigured()) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("system_parameterizations")
          .select("id, client_name, form_type, form_types, status, step_current, public_token, created_at, updated_at, form_data")
          .order("updated_at", { ascending: false });
        if (!error && data) return data;
      } catch {
        // fallback local
      }
    }
    return getLocalStore();
  });

const ALL_TYPES = ["nfe", "nfce", "mdfe", "cte", "nfse"] as const;
const STATUSES = ["pendente", "em_andamento", "concluido"] as const;

function primaryFromTypes(types: readonly (typeof ALL_TYPES)[number][]) {
  return types.includes("mdfe") && !types.includes("nfe") ? "mdfe" : (types[0] ?? "nfe");
}

function genToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const TOKEN_TTL_DAYS = 30;

function tokenExpiryFromNow() {
  return new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export const createParameterization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      client_name: z.string().min(1).max(200),
      form_types: z.array(z.enum(ALL_TYPES)).min(1),
      include_boleto: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const userId = context?.userId || "admin-local-dev";
    await assertAdmin(userId);
    const primary = primaryFromTypes(data.form_types);
    const token = genToken();
    const modules_selected: Record<string, boolean> = {};
    for (const t of data.form_types) modules_selected[t] = true;
    if (data.include_boleto) modules_selected.boleto = true;

    const newRecord = {
      id: crypto.randomUUID(),
      client_name: data.client_name,
      form_type: primary,
      form_types: data.form_types,
      form_data: { modules_selected },
      status: "pendente",
      step_current: 0,
      public_token: token,
      token_expires_at: tokenExpiryFromNow(),
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseAdminConfigured()) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row, error } = await supabaseAdmin
          .from("system_parameterizations")
          .insert(newRecord as any)
          .select("id, public_token, client_name, form_type, form_types")
          .single();
        if (!error && row) return row;
      } catch {
        // fallback local
      }
    }

    const localStore = getLocalStore();
    localStore.unshift(newRecord);
    saveLocalStore(localStore);
    return newRecord;
  });

export const updateParameterization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      client_name: z.string().min(1).max(200).optional(),
      form_types: z.array(z.enum(ALL_TYPES)).min(1).optional(),
      status: z.enum(STATUSES).optional(),
      form_data: z.record(z.string(), z.any()).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const userId = context?.userId || "admin-local-dev";
    await assertAdmin(userId);
    const patch: any = { updated_at: new Date().toISOString() };
    if (data.client_name !== undefined) patch.client_name = data.client_name;
    if (data.status !== undefined) patch.status = data.status;
    if (data.form_data !== undefined) patch.form_data = data.form_data;
    if (data.form_types !== undefined) {
      patch.form_types = data.form_types;
      patch.form_type = primaryFromTypes(data.form_types);
    }

    if (isSupabaseAdminConfigured()) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("system_parameterizations")
          .update(patch)
          .eq("id", data.id);
        if (!error) return { ok: true };
      } catch {}
    }

    const localStore = getLocalStore();
    const idx = localStore.findIndex((r) => r.id === data.id);
    if (idx !== -1) {
      localStore[idx] = { ...localStore[idx], ...patch };
      saveLocalStore(localStore);
    }
    return { ok: true };
  });

export const regenerateParameterizationToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), reopen: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const userId = context?.userId || "admin-local-dev";
    await assertAdmin(userId);
    const token = genToken();
    const patch: Record<string, unknown> = {
      public_token: token,
      token_expires_at: tokenExpiryFromNow(),
      updated_at: new Date().toISOString(),
    };
    if (data.reopen) {
      patch.completed_at = null;
      patch.status = "em_andamento";
    }

    if (isSupabaseAdminConfigured()) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row, error } = await supabaseAdmin
          .from("system_parameterizations")
          .update(patch as any)
          .eq("id", data.id)
          .select("id, public_token")
          .single();
        if (!error && row) return row;
      } catch {}
    }

    const localStore = getLocalStore();
    const idx = localStore.findIndex((r) => r.id === data.id);
    if (idx !== -1) {
      localStore[idx] = { ...localStore[idx], ...patch };
      saveLocalStore(localStore);
      return { id: data.id, public_token: token };
    }
    return { id: data.id, public_token: token };
  });

export const duplicateParameterization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const userId = context?.userId || "admin-local-dev";
    await assertAdmin(userId);
    const localStore = getLocalStore();
    const src = localStore.find((r) => r.id === data.id);
    const newRecord = {
      id: crypto.randomUUID(),
      client_name: src ? `${src.client_name} (cópia)` : "Novo Cliente (cópia)",
      form_type: src?.form_type || "nfe",
      form_types: src?.form_types || ["nfe"],
      form_data: src?.form_data || {},
      status: "pendente",
      step_current: 0,
      public_token: genToken(),
      token_expires_at: tokenExpiryFromNow(),
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseAdminConfigured()) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row, error } = await supabaseAdmin
          .from("system_parameterizations")
          .insert(newRecord as any)
          .select("id, public_token, client_name")
          .single();
        if (!error && row) return row;
      } catch {}
    }

    localStore.unshift(newRecord);
    saveLocalStore(localStore);
    return newRecord;
  });

export const deleteParameterization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const userId = context?.userId || "admin-local-dev";
    await assertAdmin(userId);
    if (isSupabaseAdminConfigured()) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("system_parameterizations").delete().eq("id", data.id);
      } catch {}
    }

    const localStore = getLocalStore();
    saveLocalStore(localStore.filter((r) => r.id !== data.id));
    return { ok: true };
  });

// PUBLIC — gated by token only
export const getParameterizationByToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(10).max(64) }).parse(d))
  .handler(async ({ data }) => {
    if (isSupabaseAdminConfigured()) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row, error } = await supabaseAdmin
          .from("system_parameterizations")
          .select(
            "id, client_name, form_type, form_types, status, step_current, form_data, updated_at, token_expires_at, completed_at",
          )
          .eq("public_token", data.token)
          .maybeSingle();
        if (!error && row) {
          return { ...(row as any), locked: Boolean((row as any).completed_at) };
        }
      } catch {}
    }

    const localStore = getLocalStore();
    const row = localStore.find((r) => r.public_token === data.token);
    if (!row) throw new Error("Link inválido ou não encontrado");
    return { ...row, locked: Boolean(row.completed_at) };
  });

export const updateParameterizationByToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        token: z.string().min(10).max(64),
        step_current: z.number().int().min(0).max(50).optional(),
        form_data: z.record(z.string(), z.any()).optional(),
        status: z.enum(["pendente", "em_andamento", "concluido"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.step_current !== undefined) patch.step_current = data.step_current;
    if (data.form_data !== undefined) patch.form_data = data.form_data as any;
    if (data.status !== undefined) {
      patch.status = data.status;
      if (data.status === "concluido") patch.completed_at = new Date().toISOString();
    }

    if (isSupabaseAdminConfigured()) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("system_parameterizations")
          .update(patch as any)
          .eq("public_token", data.token);
      } catch {}
    }

    const localStore = getLocalStore();
    const idx = localStore.findIndex((r) => r.public_token === data.token);
    if (idx !== -1) {
      localStore[idx] = { ...localStore[idx], ...patch };
      saveLocalStore(localStore);
    }
    return { ok: true };
  });

// ===== Certificado digital (.pfx/.p12) =====
const CERT_BUCKET = "certificados";

export const uploadCertificateByToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        token: z.string().min(10).max(64),
        file_name: z.string().min(1).max(200),
        content_base64: z.string().min(10),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    let currentRecord: any = null;
    if (isSupabaseAdminConfigured()) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: current, error: curErr } = await supabaseAdmin
          .from("system_parameterizations")
          .select("id, token_expires_at, completed_at")
          .eq("public_token", data.token)
          .maybeSingle();
        if (!curErr && current) {
          currentRecord = current;
        }
      } catch {
        // noop
      }
    }

    if (!currentRecord) {
      const localStore = getLocalStore();
      currentRecord = localStore.find((r) => r.public_token === data.token);
    }

    if (!currentRecord) throw new Error("Link inválido ou expirado");

    const expiresAt = currentRecord.token_expires_at as string | null;
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      throw new Error("Link expirado. Solicite um novo link ao time Certifica.");
    }
    if (currentRecord.completed_at) {
      throw new Error("Este formulário já foi finalizado e assinado.");
    }

    const binary = Uint8Array.from(atob(data.content_base64), (c) => c.charCodeAt(0));
    if (binary.byteLength > 10 * 1024 * 1024) throw new Error("Arquivo maior que 10 MB");
    const safeName = data.file_name.replace(/[^\w.\-]+/g, "_");
    const certPath = `${currentRecord.id}/${Date.now()}_${safeName}`;

    if (isSupabaseAdminConfigured()) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        try {
          const { data: buckets } = await supabaseAdmin.storage.listBuckets();
          const exists = buckets?.some((b) => b.name === CERT_BUCKET);
          if (!exists) {
            await supabaseAdmin.storage.createBucket(CERT_BUCKET, {
              public: false,
              fileSizeLimit: 10 * 1024 * 1024,
            });
          }
        } catch {}

        let { error: upErr } = await supabaseAdmin.storage
          .from(CERT_BUCKET)
          .upload(certPath, binary, { contentType: "application/x-pkcs12", upsert: true });

        if (!upErr) {
          return { path: certPath, name: data.file_name, size: binary.byteLength };
        }
      } catch {}
    }

    // Fallback local
    try {
      const uploadsDir = process.env.VERCEL
        ? path.join("/tmp", ".local_uploads", "certificados", currentRecord.id)
        : path.resolve(process.cwd(), ".local_uploads", "certificados", currentRecord.id);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const localFilePath = path.join(uploadsDir, `${Date.now()}_${safeName}`);
      fs.writeFileSync(localFilePath, binary);
      return { path: `local://${certPath}`, name: data.file_name, size: binary.byteLength };
    } catch (localErr: any) {
      throw new Error(`Falha ao salvar o certificado: ${localErr?.message || "erro de armazenamento"}`);
    }
  });

export const getCertificateDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().min(3).max(400) }).parse(d))
  .handler(async ({ context, data }) => {
    const userId = context?.userId || "admin-local-dev";
    await assertAdmin(userId);
    if (isSupabaseAdminConfigured()) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const cleanPath = data.path.replace(/^local:\/\//, "");
        const { data: signed, error } = await supabaseAdmin.storage
          .from(CERT_BUCKET)
          .createSignedUrl(cleanPath, 300, { download: true });
        if (!error && signed) {
          return { url: signed.signedUrl };
        }
      } catch {}
    }
    return { url: "#" };
  });
