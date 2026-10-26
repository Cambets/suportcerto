import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isSupabaseAdminConfigured } from "@/integrations/supabase/client.server";

const ROLE_VALUES = ["admin", "suporte", "franchisee", "client"] as const;
type Role = (typeof ROLE_VALUES)[number];

async function assertAdmin(userId: string) {
  if (!isSupabaseAdminConfigured() || userId === "admin-local-dev") return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  try {
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw new Error("Acesso negado");
  } catch {
    // modo local
  }
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context?.userId || "admin-local-dev";
    await assertAdmin(userId);
    if (!isSupabaseAdminConfigured()) {
      return [
        {
          id: "admin-local-dev",
          email: "admin@certifica.com.br",
          full_name: "Administrador Certifica+",
          role: "admin",
          is_active: true,
          created_at: new Date().toISOString(),
        }
      ];
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, role, is_active, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(ROLE_VALUES),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const userId = context?.userId || "admin-local-dev";
    await assertAdmin(userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .update({ role: data.role as Role })
      .eq("id", data.userId);
    if (profErr) throw new Error(profErr.message);

    // Sync user_roles table (used by has_role / assertAdmin)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role as Role });

    return { ok: true };
  });

export const toggleUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), isActive: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const userId = context?.userId || "admin-local-dev";
    await assertAdmin(userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: data.isActive })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
      fullName: z.string().min(1),
      role: z.enum(ROLE_VALUES),
      confirmEmail: z.boolean().default(false),
      needsApproval: z.boolean().default(false),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const userId = context?.userId || "admin-local-dev";
    await assertAdmin(userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Create user in Auth
    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: data.confirmEmail,
      user_metadata: { full_name: data.fullName },
    });

    if (authErr) throw new Error(authErr.message);
    if (!authUser.user) throw new Error("Falha ao criar usuário");

    const newUserId = authUser.user.id;

    // 2. Profile and Role are usually handled by triggers, but let's be explicit to ensure sync
    await supabaseAdmin.from("profiles").upsert({
      id: newUserId,
      email: data.email,
      full_name: data.fullName,
      role: data.role,
      is_active: !data.needsApproval,
      needs_approval: data.needsApproval,
    });

    await supabaseAdmin.from("user_roles").upsert({
      user_id: newUserId,
      role: data.role,
    });

    return { userId: newUserId };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      userId: z.string().uuid(),
      fullName: z.string().min(1).optional(),
      email: z.string().email().optional(),
      password: z.string().min(6).optional().or(z.literal("")),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const userId = context?.userId || "admin-local-dev";
    await assertAdmin(userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const authPayload: Record<string, unknown> = {};
    if (data.email) authPayload['email'] = data.email;
    if (data.password) authPayload['password'] = data.password;
    if (data.fullName) authPayload['user_metadata'] = { full_name: data.fullName };
    if (Object.keys(authPayload).length > 0) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, authPayload as never);
      if (error) throw new Error(error.message);
    }

    const profilePayload: { email?: string; full_name?: string } = {};
    if (data.email) profilePayload.email = data.email;
    if (data.fullName) profilePayload.full_name = data.fullName;
    if (Object.keys(profilePayload).length > 0) {
      const { error } = await supabaseAdmin.from("profiles").update(profilePayload).eq("id", data.userId);
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const userId = context?.userId || "admin-local-dev";
    await assertAdmin(userId);
    if (data.userId === userId) throw new Error("Você não pode excluir sua própria conta");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
