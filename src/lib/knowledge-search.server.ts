import { supabaseAdmin, isSupabaseAdminConfigured } from "@/integrations/supabase/client.server";
import { SEFAZ_REJEICOES, SEFAZ_CONCEITOS, findRejeicaoByCode } from "@/data/sefaz-rejeicoes";
import { getErpKnowledgeContext } from "@/data/erp-knowledge";

const STOPWORDS = new Set([
  "a","o","as","os","de","da","do","das","dos","e","ou","para","por","com","sem","um","uma","uns","umas",
  "que","qual","quais","como","onde","quando","porque","por que","se","na","no","nas","nos","em","ao","aos",
  "is","the","and","or","of","to","for","on","in","at","by","with","what","how","when","where","why",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function searchSefazRejeicoesContext(question: string, maxItems = 2): string {
  // 1) Busca direta por número de código (ex: 539, 203, 120, 694)
  const numbers = question.match(/\b\d{3}\b/g);
  const foundByCode = new Map<string, typeof SEFAZ_REJEICOES[0]>();

  if (numbers) {
    for (const num of numbers) {
      const match = findRejeicaoByCode(num);
      if (match) {
        foundByCode.set(match.codigo, match);
      }
    }
  }

  // 2) Se o usuário perguntou sobre rejeição/erro/sefaz/alerta/nota mas não colocou código, busca textual no acervo
  const isSefazQuery = /rejei|sefaz|denega|conting|inutiliz|nfe|nfce|cstat|danfe|recusa|alerta|erro fiscal/i.test(question);
  if (foundByCode.size === 0 && isSefazQuery) {
    const tokens = tokenize(question);
    if (tokens.length > 0) {
      const scored = SEFAZ_REJEICOES.map((r) => {
        const text = `${r.codigo} ${r.mensagem_oficial_sefaz} ${r.causa_provavel} ${r.como_resolver} ${r.passo_a_passo_erp} ${r.categoria}`;
        const haystack = new Set(tokenize(text));
        const score = tokens.reduce((acc, t) => acc + (haystack.has(t) ? 1 : 0), 0);
        return { r, score };
      });
      scored.sort((a, b) => b.score - a.score);
      for (const item of scored.slice(0, maxItems)) {
        if (item.score > 1) {
          foundByCode.set(item.r.codigo, item.r);
        }
      }
    }
  }

  // 3) Busca conceitual em SEFAZ_CONCEITOS (ex.: cStat 120 alerta, Denegação vs Rejeição)
  let conceitoContext = "";
  const tokens = tokenize(question);
  if (tokens.length > 0 && isSefazQuery) {
    const matchedConceitos = SEFAZ_CONCEITOS.filter((c) => {
      const fullText = `${c.titulo} ${c.secao} ${Object.entries(c.conteudo).map(([k, v]) => `${k} ${v}`).join(" ")}`;
      const hay = new Set(tokenize(fullText));
      const hits = tokens.filter((t) => hay.has(t)).length;
      return hits >= 2 || (question.includes("120") && c.secao.includes("120")) || (question.toLowerCase().includes("alerta") && c.secao.toLowerCase().includes("alerta"));
    });

    if (matchedConceitos.length > 0) {
      conceitoContext = matchedConceitos
        .slice(0, 1)
        .map((c) => {
          const body = Object.entries(c.conteudo)
            .map(([k, v]) => `- **${k}:** ${v}`)
            .join("\n");
          return `### REGRA OFICIAL SEFAZ — ${c.secao}\n${body}`;
        })
        .join("\n\n---\n\n");
    }
  }

  const codigosContext = Array.from(foundByCode.values())
    .slice(0, maxItems)
    .map((r) => {
      return `### BASE SEFAZ — ${r.mensagem_oficial_sefaz || `Código ${r.codigo}`} (${r.modelos})
- Categoria: ${r.categoria}
- Causa provável: ${r.causa_provavel}
- Diagnóstico / Como resolver: ${r.como_resolver}
- Passo a passo no ERP Certifica / Módulo Fiscal: ${r.passo_a_passo_erp}`;
    })
    .join("\n\n---\n\n");

  const combined = [conceitoContext, codigosContext].filter(Boolean).join("\n\n---\n\n");
  return combined;
}

export async function searchKnowledge(question: string, limit = 4): Promise<string> {
  const sefazContext = searchSefazRejeicoesContext(question);
  const erpContext = getErpKnowledgeContext(question, 2);

  const tokens = tokenize(question);
  if (tokens.length === 0) {
    return [sefazContext, erpContext].filter(Boolean).join("\n\n---\n\n");
  }

  let dbContext = "";
  if (isSupabaseAdminConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from("knowledge_entries")
        .select("title, content, tags")
        .limit(200);

      if (!error && data && data.length > 0) {
        const scored = data.map((entry) => {
          const haystack = tokenize(`${entry.title} ${entry.content} ${(entry.tags ?? []).join(" ")}`);
          const hay = new Set(haystack);
          const score = tokens.reduce((acc, t) => acc + (hay.has(t) ? 1 : 0), 0);
          return { entry, score };
        });

        scored.sort((a, b) => b.score - a.score);
        const top = scored.filter((s) => s.score > 0).slice(0, limit);
        if (top.length > 0) {
          dbContext = top
            .map(({ entry }) => `### ${entry.title}\n${entry.content}`)
            .join("\n\n---\n\n");
        }
      }
    } catch (err) {
      console.error("[searchKnowledge] Erro ao consultar Supabase:", err);
    }
  }

  const parts = [sefazContext, erpContext, dbContext].filter(Boolean);
  return parts.join("\n\n---\n\n");
}
