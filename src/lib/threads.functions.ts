import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { publicSupabase } from "@/integrations/supabase/public-middleware";
import {
  saveLocalThread,
  getLocalThread,
  listLocalThreads,
  deleteLocalThread,
  renameLocalThread,
} from "@/lib/threads.store.server";

export const listThreads = createServerFn({ method: "POST" })
  .middleware([publicSupabase])
  .inputValidator((d: unknown) =>
    z.object({ visitorId: z.string().min(1) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    try {
      const { data: rows, error } = await context.supabase
        .from("threads")
        .select("id, title, updated_at, messages!inner(id)")
        .eq("visitor_id", data.visitorId)
        .order("updated_at", { ascending: false })
        .limit(100);
      if (!error && rows) {
        const seen = new Set<string>();
        const unique: Array<{ id: string; title: string; updated_at: string }> = [];
        for (const r of rows ?? []) {
          if (seen.has(r.id)) continue;
          seen.add(r.id);
          unique.push({ id: r.id, title: r.title, updated_at: r.updated_at });
        }
        if (unique.length > 0) return unique;
      }
    } catch (err) {
      console.warn("[threads.functions] listThreads Supabase fallback to local:", err);
    }
    return listLocalThreads(data.visitorId);
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
    try {
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
      if (!error && data?.id) {
        saveLocalThread({
          id: data.id,
          visitor_id: input.visitorId,
          visitor_name: input.visitorName,
          visitor_email: input.visitorEmail,
          visitor_phone: input.visitorPhone,
          visitor_document: input.visitorDocument,
        });
        return { id: data.id as string };
      }
    } catch (err) {
      console.warn("[threads.functions] createThread Supabase fallback to local:", err);
    }

    // Fallback local garantido (UUID v4 padrão)
    const localId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "local-" + Math.random().toString(36).substring(2, 9);
    saveLocalThread({
      id: localId,
      title: "Nova conversa",
      visitor_id: input.visitorId,
      visitor_name: input.visitorName,
      visitor_email: input.visitorEmail,
      visitor_phone: input.visitorPhone,
      visitor_document: input.visitorDocument,
      utm_source: input.utmSource,
      utm_medium: input.utmMedium,
      utm_campaign: input.utmCampaign,
    });
    return { id: localId };
  });

export const getThread = createServerFn({ method: "POST" })
  .middleware([publicSupabase])
  .inputValidator((d: unknown) =>
    z.object({
      threadId: z.string().min(1),
      visitorId: z.string().min(1),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    try {
      const { data: thread } = await context.supabase
        .from("threads")
        .select("id, title, visitor_id, contact_type, lead_company")
        .eq("id", data.threadId)
        .eq("visitor_id", data.visitorId)
        .maybeSingle();
      if (thread) {
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
      }
    } catch (err) {
      console.warn("[threads.functions] getThread Supabase fallback to local:", err);
    }

    const local = getLocalThread(data.threadId, data.visitorId);
    if (local) {
      return {
        thread: {
          id: local.id,
          title: local.title,
          contact_type: (local.contact_type || "suporte") as "suporte" | "lead" | "indefinido",
          lead_company: local.lead_company,
        },
        messages: local.messages ?? [],
      };
    }

    // Auto-criação da conversa caso ela exista no front para não travar a tela
    const fallbackThread = saveLocalThread({
      id: data.threadId,
      visitor_id: data.visitorId,
      title: "Nova conversa",
    });

    return {
      thread: {
        id: fallbackThread.id,
        title: fallbackThread.title,
        contact_type: "suporte",
        lead_company: undefined,
      },
      messages: fallbackThread.messages ?? [],
    };
  });

export const renameThread = createServerFn({ method: "POST" })
  .middleware([publicSupabase])
  .inputValidator((d: unknown) =>
    z.object({
      threadId: z.string().min(1),
      visitorId: z.string().min(1),
      title: z.string().min(1).max(120),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    renameLocalThread(data.threadId, data.title);
    try {
      const { data: updated, error } = await context.supabase
        .from("threads")
        .update({ title: data.title })
        .eq("id", data.threadId)
        .eq("visitor_id", data.visitorId)
        .select("id")
        .maybeSingle();
      if (!error && updated) return { ok: true };
    } catch (err) {
      console.warn("[threads.functions] renameThread Supabase fallback:", err);
    }
    return { ok: true };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([publicSupabase])
  .inputValidator((d: unknown) =>
    z.object({
      threadId: z.string().min(1),
      visitorId: z.string().min(1),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    deleteLocalThread(data.threadId, data.visitorId);
    try {
      const { data: deleted, error } = await context.supabase
        .from("threads")
        .delete()
        .eq("id", data.threadId)
        .eq("visitor_id", data.visitorId)
        .select("id")
        .maybeSingle();
      if (!error && deleted) return { ok: true };
    } catch (err) {
      console.warn("[threads.functions] deleteThread Supabase fallback:", err);
    }
    return { ok: true };
  });

export const updateLeadDetails = createServerFn({ method: "POST" })
  .middleware([publicSupabase])
  .inputValidator((d: unknown) =>
    z.object({
      threadId: z.string().min(1),
      visitorId: z.string().min(1),
      leadCompany: z.string().max(200).optional(),
      leadCnpj: z.string().max(40).optional(),
      leadInterest: z.string().max(1000).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const local = getLocalThread(data.threadId, data.visitorId);
    if (local) {
      local.lead_company = data.leadCompany;
      local.lead_cnpj = data.leadCnpj;
      local.lead_interest = data.leadInterest;
      saveLocalThread(local);
    }
    try {
      await context.supabase
        .from("threads")
        .update({
          lead_company: data.leadCompany,
          lead_cnpj: data.leadCnpj,
          lead_interest: data.leadInterest,
        })
        .eq("id", data.threadId);
    } catch (err) {
      console.warn("[threads.functions] updateLeadDetails Supabase fallback:", err);
    }
    return { ok: true };
  });
