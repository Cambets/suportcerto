import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { publicSupabase } from "@/integrations/supabase/public-middleware";

export const listThreads = createServerFn({ method: "POST" })
  .middleware([publicSupabase])
  .inputValidator((d: unknown) =>
    z.object({ visitorId: z.string().min(1) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("threads")
      .select("id, title, updated_at, messages!inner(id)")
      .eq("visitor_id", data.visitorId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    // Dedupe (inner join expande por mensagem) e remove campo embutido
    const seen = new Set<string>();
    const unique: Array<{ id: string; title: string; updated_at: string }> = [];
    for (const r of rows ?? []) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      unique.push({ id: r.id, title: r.title, updated_at: r.updated_at });
    }
    return unique;
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([publicSupabase])
  .inputValidator((d: unknown) =>
    z.object({
      visitorId: z.string().min(1),
      visitorName: z.string().optional(),
      visitorEmail: z.string().optional(),
      visitorPhone: z.string().optional(),
      visitorDocument: z.string().optional(),
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
    }).parse(d)
  )
  .handler(async ({ context, data: input }) => {
    // Limpa conversas vazias (sem mensagens) do mesmo visitante antes de criar nova
    const { data: existing } = await context.supabase
      .from("threads")
      .select("id, messages(id)")
      .eq("visitor_id", input.visitorId);
    const emptyIds = (existing ?? [])
      .filter((t: { id: string; messages: unknown[] }) => !t.messages || t.messages.length === 0)
      .map((t) => t.id);
    if (emptyIds.length > 0) {
      await context.supabase.from("threads").delete().in("id", emptyIds);
    }

    const { data, error } = await context.supabase
      .from("threads")
      .insert({
        title: "Nova conversa",
        visitor_id: input.visitorId,
        visitor_name: input.visitorName,
        visitor_email: input.visitorEmail,
        visitor_phone: input.visitorPhone,
        visitor_document: input.visitorDocument,
        utm_source: input.utmSource,
        utm_medium: input.utmMedium,
        utm_campaign: input.utmCampaign,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id as string };
  });

export const getThread = createServerFn({ method: "POST" })
  .middleware([publicSupabase])
  .inputValidator((d: unknown) =>
    z.object({
      threadId: z.string().uuid(),
      visitorId: z.string().min(1),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: thread } = await context.supabase
      .from("threads")
      .select("id, title, visitor_id, contact_type, lead_company")
      .eq("id", data.threadId)
      .eq("visitor_id", data.visitorId)
      .maybeSingle();
    if (!thread) return { thread: null, messages: [] };
    const { data: messages } = await context.supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    return {
      thread: {
        id: thread.id,
        title: thread.title,
        contact_type: thread.contact_type as "suporte" | "lead" | "indefinido",
        lead_company: thread.lead_company,
      },
      messages: messages ?? [],
    };
  });

export const renameThread = createServerFn({ method: "POST" })
  .middleware([publicSupabase])
  .inputValidator((d: unknown) =>
    z.object({
      threadId: z.string().uuid(),
      visitorId: z.string().min(1),
      title: z.string().min(1).max(120),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: updated, error } = await context.supabase
      .from("threads")
      .update({ title: data.title })
      .eq("id", data.threadId)
      .eq("visitor_id", data.visitorId)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Conversa não encontrada");
    return { ok: true };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([publicSupabase])
  .inputValidator((d: unknown) =>
    z.object({
      threadId: z.string().uuid(),
      visitorId: z.string().min(1),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: deleted, error } = await context.supabase
      .from("threads")
      .delete()
      .eq("id", data.threadId)
      .eq("visitor_id", data.visitorId)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!deleted) throw new Error("Conversa não encontrada");
    return { ok: true };
  });

export const updateLeadDetails = createServerFn({ method: "POST" })
  .middleware([publicSupabase])
  .inputValidator((d: unknown) =>
    z.object({
      threadId: z.string().uuid(),
      visitorId: z.string().min(1),
      leadCompany: z.string().max(200).optional(),
      leadCnpj: z.string().max(40).optional(),
      leadInterest: z.string().max(1000).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    // Verify visitor owns this thread
    const { data: thread } = await context.supabase
      .from("threads")
      .select("visitor_id")
      .eq("id", data.threadId)
      .maybeSingle();
    if (!thread || thread.visitor_id !== data.visitorId) {
      throw new Error("Conversa não encontrada");
    }
    const { error } = await context.supabase
      .from("threads")
      .update({
        lead_company: data.leadCompany,
        lead_cnpj: data.leadCnpj,
        lead_interest: data.leadInterest,
      })
      .eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
