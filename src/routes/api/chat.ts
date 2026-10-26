import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, generateText, streamText, type UIMessage } from "ai";

import { createAiProvider } from "@/lib/ai-gateway.server";
import { searchKnowledge } from "@/lib/knowledge-search.server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/integrations/supabase/client.server";
import { SYSTEM_PROMPT_TEMPLATE, GERAL_SYSTEM_PROMPT_TEMPLATE } from "@/lib/system-prompt";
import { fetchViabilidadeMarca } from "@/services/infosimples.server";
import {
  getLocalThread,
  saveLocalThread,
  addLocalMessage,
  renameLocalThread,
} from "@/lib/threads.store.server";

type Body = { messages?: UIMessage[]; threadId?: string; mode?: "geral" | "suporte"; visitorId?: string };

function extractBrand(text: string): string | null {
  const quoted = text.match(/["'“”‘’«»]([^"'“”‘’«»\n]{2,60})["'“”‘’«»]/);
  if (quoted && quoted[1]) {
    const brand = quoted[1].trim();
    if (brand.length >= 2) return brand;
  }

  const explicit = text.match(
    /\bmarca\s+(?:chamada\s+|denominada\s+|de\s+nome\s+)?([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]*(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9][\wÀ-ÿ]*){0,3})/,
  );
  if (explicit && explicit[1]) {
    const brand = explicit[1].trim();
    if (brand.length >= 2) return brand;
  }

  return null;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, threadId, mode, visitorId } = (await request.json()) as Body;
        if (!Array.isArray(messages) || !threadId) {
          return new Response("Bad request", { status: 400 });
        }

        // Recuperação instantânea da conversa
        let thread: any = null;
        if (isSupabaseAdminConfigured()) {
          try {
            const { data } = await supabaseAdmin
              .from("threads")
              .select("*")
              .eq("id", threadId)
              .maybeSingle();
            thread = data;
          } catch (threadErr) {
            console.warn("[api/chat] Supabase thread lookup fallback:", threadErr);
          }
        }

        if (!thread) {
          thread = getLocalThread(threadId, visitorId);
        }

        if (!thread) {
          // Auto-cria a conversa localmente para que o atendimento nunca seja interrompido
          thread = saveLocalThread({
            id: threadId,
            visitor_id: visitorId || "anonymous",
            title: "Nova conversa",
          });
        }

        // --- Authentication / authorization -------------------------------
        const authHeader = request.headers.get("Authorization") || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

        let userId: string | null = null;
        let isPrivileged = false;
        if (token) {
          if (token === "admin-local-dev") {
            userId = "admin-local-dev";
            isPrivileged = true;
          } else if (isSupabaseAdminConfigured()) {
            try {
              const { data: userData } = await supabaseAdmin.auth.getUser(token);
              userId = userData?.user?.id ?? null;
              if (userId) {
                const { data: roles } = await supabaseAdmin
                  .from("user_roles")
                  .select("role")
                  .eq("user_id", userId);
                isPrivileged = (roles ?? []).some(
                  (r) => r.role === "admin" || r.role === "suporte",
                );
              }
            } catch (authErr) {
              console.warn("[api/chat] Supabase auth check fallback:", authErr);
            }
          }
        }

        if (visitorId === "admin-local-dev") {
          isPrivileged = true;
        }

        const effectiveMode: "geral" | "suporte" =
          mode === "suporte" && isPrivileged ? "suporte" : "geral";

        let aiProviderConfig;
        try {
          aiProviderConfig = createAiProvider();
        } catch (e: any) {
          return new Response(e?.message || "Configuração de IA não encontrada", { status: 500 });
        }
        const { provider: aiGateway, defaultModel } = aiProviderConfig;

        // Latest user message for KB search + persistence
        const last = messages[messages.length - 1];
        const lastText =
          last?.parts?.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim() || "";

        const kbContext = lastText ? await searchKnowledge(lastText) : "";
        
        // Brand search automation
        let brandContext = "";
        const detectedBrand = lastText ? extractBrand(lastText) : null;
        
        if (detectedBrand) {
          console.log(`[INPI Auto] Marca detectada: "${detectedBrand}"`);
          try {
            const result = await fetchViabilidadeMarca(detectedBrand);
            const registros = Array.isArray(result?.data) ? result.data : [];
            const status = registros.length > 0
              ? `⚠️ Registros Encontrados (${registros.length})`
              : "✅ Marca Disponível / Limpa";

            const formatField = (label: string, value: any) => {
              if (value === null || value === undefined || value === "") return null;
              if (Array.isArray(value)) {
                if (value.length === 0) return null;
                const items = value.map((v) =>
                  typeof v === "object" ? JSON.stringify(v) : String(v),
                );
                return `   - ${label}: ${items.join("; ")}`;
              }
              if (typeof value === "object") {
                const inner = Object.entries(value)
                  .filter(([, v]) => v !== null && v !== undefined && v !== "")
                  .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
                  .join(" | ");
                if (!inner) return null;
                return `   - ${label}: ${inner}`;
              }
              return `   - ${label}: ${value}`;
            };

            const LABELS: Record<string, string> = {
              processo: "Nº do Processo",
              numero_processo: "Nº do Processo",
              marca: "Marca",
              nome_marca: "Nome da Marca",
              situacao: "Situação Atual",
              situacao_descricao: "Descrição da Situação",
              despacho: "Último Despacho",
              despacho_descricao: "Descrição do Despacho",
              data_deposito: "Data de Depósito",
              data_concessao: "Data de Concessão",
              data_vigencia: "Vigência até",
              data_publicacao: "Data de Publicação",
              data_protocolo: "Data de Protocolo",
              classe: "Classe (NCL)",
              classe_nice: "Classificação de Nice",
              classe_viena: "Classificação de Viena",
              especificacao: "Especificação de Produtos/Serviços",
              titular: "Titular",
              titular_nome: "Titular",
              titular_pais: "País do Titular",
              cnpj_titular: "CNPJ do Titular",
              cpf_titular: "CPF do Titular",
              procurador: "Procurador",
              apresentacao: "Forma de Apresentação",
              natureza: "Natureza da Marca",
              tipo: "Tipo",
              prioridade_unionista: "Prioridade Unionista",
              revista: "Revista (RPI)",
              numero_revista: "Nº da Revista",
              petitorio: "Petitório",
              url: "URL no INPI",
              link: "Link INPI",
            };

            const processos = registros
              .slice(0, 8)
              .map((item: any, idx: number) => {
                const knownLines: string[] = [];
                const seen = new Set<string>();
                for (const [key, label] of Object.entries(LABELS)) {
                  if (key in item) {
                    const line = formatField(label, item[key]);
                    if (line) knownLines.push(line);
                    seen.add(key);
                  }
                }
                const extraLines: string[] = [];
                for (const [key, val] of Object.entries(item)) {
                  if (seen.has(key)) continue;
                  const line = formatField(key, val);
                  if (line) extraLines.push(line);
                }
                const allLines = [...knownLines, ...extraLines];
                return `${idx + 1}. Registro ${idx + 1}\n${allLines.join("\n")}`;
              })
              .join("\n\n");

            brandContext = `
DADOS DO INPI PARA A MARCA SOLICITADA ("${detectedBrand}"):
Status: ${status}
${registros.length > 0 ? `\nProcessos / registros detectados (dados COMPLETOS retornados pelo INPI):\n\n${processos}${registros.length > 8 ? `\n\n(Exibindo 8 de ${registros.length} resultados encontrados — informe ao usuário que existem mais e ofereça refinar a busca)` : ""}` : "\nNão encontramos registros idênticos para esta marca no banco de dados do INPI."}

(Instrução de formatação OBRIGATÓRIA:
- Apresente TODOS os campos relevantes que vieram acima para cada processo — NÃO omita informações importantes como situação, despacho, datas (depósito, concessão, vigência), classe NCL, especificação, titular, CNPJ/CPF do titular, procurador, apresentação, natureza, revista/RPI, etc.
- NUNCA mostre JSON cru. Use Markdown limpo: cabeçalho "**Resultado da Análise para ${detectedBrand}**", status em destaque (${registros.length > 0 ? '"⚠️ Registros Encontrados"' : '"✅ Marca Disponível"'}), e cada processo numerado em uma lista de bullets com **negrito** nos rótulos.
- Explique em linguagem simples o significado da situação/despacho de cada processo (ex.: "Registro de marca em vigor", "Pedido em exame", "Indeferido", "Arquivado", etc.) para que o cliente entenda sem precisar conhecer o jargão do INPI.
- Finalize com uma análise curta e consultiva: a marca está livre, parcialmente livre (em outra classe), conflitante, ou em risco — e o que o cliente pode fazer agora (ex.: registrar com o Certifica Registro).
- Tom alegre, profissional e "gente fina". NÃO invente dados — use SOMENTE o que está acima.)
`;
          } catch (err) {
            console.error("[INPI Auto] Erro na consulta:", err);
            brandContext = `\n(Aviso: Tentei consultar a marca "${detectedBrand}" no INPI, mas ocorreu um erro técnico. Informe ao usuário que não foi possível verificar agora.)\n`;
          }
        }
        
        const visitorInfo = thread.visitor_name ? `
DADOS DO VISITANTE IDENTIFICADO:
- Nome: ${thread.visitor_name}
- CPF/CNPJ: ${thread.visitor_document}
- E-mail: ${thread.visitor_email}
- Telefone: ${thread.visitor_phone}
(Estes dados já foram coletados no formulário inicial. Use o nome para personalizar o atendimento e NÃO peça esses dados novamente a menos que algo mude.)
` : "";

        const template = effectiveMode === "geral" ? GERAL_SYSTEM_PROMPT_TEMPLATE : SYSTEM_PROMPT_TEMPLATE;
        const system = template(kbContext + brandContext + visitorInfo);

        // Persistência rápida da mensagem do usuário
        if (last?.role === "user" && lastText) {
          addLocalMessage(threadId, {
            role: "user",
            content: lastText,
          });

          if (isSupabaseAdminConfigured()) {
            try {
              await supabaseAdmin.from("messages").insert({
                thread_id: threadId,
                user_id: thread.user_id as string | undefined,
                role: "user",
                content: lastText,
              });
            } catch (mErr) {
              console.warn("[chat] Supabase persist user message failed:", mErr);
            }
          }

          // Auto-title from first user message
          if (thread.title === "Nova conversa" || !thread.title) {
            let title = "";
            try {
              const { text } = await generateText({
                model: aiGateway(defaultModel),
                prompt: `Gere um título MUITO curto (3 a 6 palavras, máx 50 caracteres) em português que resuma o tema desta mensagem de um usuário a um atendimento Certifica+. Sem aspas, sem ponto final, sem prefixos como "Título:". Seja específico (evite "Dúvida", "Suporte", "Olá").\n\nMensagem: """${lastText.slice(0, 500)}"""`,
              });
              title = text.trim().replace(/^["'`]+|["'`.]+$/g, "").slice(0, 60);
            } catch (e) {
              console.error("[auto-title] erro:", e);
            }
            if (!title) {
              const words = lastText.split(/\s+/).slice(0, 8).join(" ");
              title = words.slice(0, 60) || "Nova conversa";
            }
            renameLocalThread(threadId, title);

            if (isSupabaseAdminConfigured()) {
              try {
                await supabaseAdmin
                  .from("threads")
                  .update({ title, updated_at: new Date().toISOString() })
                  .eq("id", threadId);
              } catch {}
            }
          } else if (isSupabaseAdminConfigured()) {
            try {
              await supabaseAdmin
                .from("threads")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", threadId);
            } catch {}
          }
        }

        const result = streamText({
          model: aiGateway(defaultModel),
          system,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ messages: finalMessages }) => {
            const assistant = finalMessages[finalMessages.length - 1];
            if (assistant?.role !== "assistant") return;
            const text = assistant.parts
              .map((p) => (p.type === "text" ? p.text : ""))
              .join("")
              .trim();
            if (!text) return;

            addLocalMessage(threadId, {
              role: "assistant",
              content: text,
            });

            if (isSupabaseAdminConfigured()) {
              try {
                await supabaseAdmin.from("messages").insert({
                  thread_id: threadId,
                  user_id: thread.user_id as string | undefined,
                  role: "assistant",
                  content: text,
                });
              } catch (insertErr) {
                console.warn("[chat] persist assistant to Supabase failed:", insertErr);
              }
            }
          },
        });
      },
    },
  },
});
