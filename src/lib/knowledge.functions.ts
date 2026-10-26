import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isSupabaseAdminConfigured } from "@/integrations/supabase/client.server";

export const listKnowledge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!isSupabaseAdminConfigured()) return [];
    try {
      const supabase = context?.supabase || (await import("@/integrations/supabase/client.server")).supabaseAdmin;
      const { data, error } = await supabase
        .from("knowledge_entries")
        .select("id, title, content, tags, created_by, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (error) return [];
      return data ?? [];
    } catch {
      return [];
    }
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(20000),
  tags: z.array(z.string().min(1).max(40)).max(10).default([]),
});

export const upsertKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const supabase = context?.supabase || (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    const userId = context?.userId || "admin-local-dev";
    if (data.id) {
      const { error } = await supabase
        .from("knowledge_entries")
        .update({ title: data.title, content: data.content, tags: data.tags })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("knowledge_entries")
      .insert({
        created_by: userId,
        title: data.title,
        content: data.content,
        tags: data.tags,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const supabase = context?.supabase || (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    const { error } = await supabase
      .from("knowledge_entries")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
