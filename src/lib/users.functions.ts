import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isSupabaseAdminConfigured } from "@/integrations/supabase/client.server";
import {
  getLocalUsers,
  saveLocalUser,
  updateLocalUserRole,
  toggleLocalUserActive,
  deleteLocalUser,
} from "./users.store.server";

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
    // modo local ou fallback
  }
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context?.userId || "admin-local-dev";
    await assertAdmin(userId);

    const localList = getLocalUsers();

    if (!isSupabaseAdminConfigured()) {
      return localList;
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, role, is_active, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error || !data || data.length === 0) {
        return localList;
      }
      return data;
    } catch {
      return localList;
    }
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        userId: z.string().min(1),
        role: z.enum(ROLE_VALUES),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const userId = context?.userId || "admin-local-dev";
    await assertAdmin(userId);

    updateLocalUserRole(data.userId, data.role as Role);

    if (isSupabaseAdminConfigured()) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("profiles")
          .update({ role: data.role as Role })
          .eq("id", data.userId);

        await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
        await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role as Role });
      } catch (err) {
        console.warn("[users.functions] Supabase updateRole fallback:", err);
      }
    }

    return { ok: true };
  });

export const toggleUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ userId: z.string().min(1), isActive: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const userId = context?.userId || "admin-local-dev";
    await assertAdmin(userId);

    toggleLocalUserActive(data.userId, data.isActive);

    if (isSupabaseAdminConfigured()) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("profiles")
          .update({ is_active: data.isActive })
          .eq("id", data.userId);
      } catch (err) {
        console.warn("[users.functions] Supabase toggleActive fallback:", err);
      }
    }

    return { ok: true };
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
        fullName: z.string().min(1),
        role: z.enum(ROLE_VALUES),
        confirmEmail: z.boolean().default(false),
        needsApproval: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const userId = context?.userId || "admin-local-dev";
    await assertAdmin(userId);

    // Save in local persistent store
    const localUser = saveLocalUser({
      email: data.email,
      full_name: data.fullName,
      role: data.role,
      is_active: !data.needsApproval,
      needs_approval: data.needsApproval,
    });

    if (isSupabaseAdminConfigured()) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email: data.email,
          password: data.password,
          email_confirm: data.confirmEmail,
          user_metadata: { full_name: data.fullName },
        });

        if (!authErr && authUser?.user) {
          const newUserId = authUser.user.id;
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
        }
      } catch (err) {
        console.warn("[users.functions] Supabase createUser fallback:", err);
      }
    }

    return { userId: localUser.id };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        userId: z.string().min(1),
        fullName: z.string().min(1).optional(),
        email: z.string().email().optional(),
        password: z.string().min(6).optional().or(z.literal("")),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const userId = context?.userId || "admin-local-dev";
    await assertAdmin(userId);

    saveLocalUser({
      id: data.userId,
      email: data.email || "",
      full_name: data.fullName || "",
    });

    if (isSupabaseAdminConfigured()) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const authPayload: Record<string, unknown> = {};
        if (data.email) authPayload["email"] = data.email;
        if (data.password) authPayload["password"] = data.password;
        if (data.fullName) authPayload["user_metadata"] = { full_name: data.fullName };
        if (Object.keys(authPayload).length > 0) {
          await supabaseAdmin.auth.admin.updateUserById(data.userId, authPayload as never);
        }

        const profilePayload: { email?: string; full_name?: string } = {};
        if (data.email) profilePayload.email = data.email;
        if (data.fullName) profilePayload.full_name = data.fullName;
        if (Object.keys(profilePayload).length > 0) {
          await supabaseAdmin.from("profiles").update(profilePayload).eq("id", data.userId);
        }
      } catch (err) {
        console.warn("[users.functions] Supabase updateUser fallback:", err);
      }
    }

    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ userId: z.string().min(1) }).parse(d))
  .handler(async ({ context, data }) => {
    const userId = context?.userId || "admin-local-dev";
    await assertAdmin(userId);
    if (data.userId === userId) throw new Error("Você não pode excluir sua própria conta");

    deleteLocalUser(data.userId);

    if (isSupabaseAdminConfigured()) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
        await supabaseAdmin.auth.admin.deleteUser(data.userId);
      } catch (err) {
        console.warn("[users.functions] Supabase deleteUser fallback:", err);
      }
    }

    return { ok: true };
  });
