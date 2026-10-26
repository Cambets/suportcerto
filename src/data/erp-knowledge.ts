import ERP_DATA_RAW from "./erp-knowledge.json";

export interface ErpAula {
  titulo: string;
  resumo: string;
  cobertura?: "detalhado" | "condensado" | "somente_video" | "registro" | "nao_recuperado" | string;
  curso: string;
  modulo: string;
}

export interface ErpModulo {
  nome: string;
  aulas: {
    titulo: string;
    resumo: string;
    cobertura?: string;
  }[];
}

export interface ErpCurso {
  nome: string;
  descricao?: string;
  total_aulas: number;
  modulos: ErpModulo[];
}

export interface ErpKnowledgeMeta {
  versao: string;
  data: string;
  fonte: string;
  uso: string;
  total_cursos: number;
  total_aulas: number;
}

const rawData = ERP_DATA_RAW as any;

export const ERP_METADATA: ErpKnowledgeMeta = rawData.meta;

// Aplanar todas as 668 aulas para busca ultra-rápida e contextual
export const ERP_AULAS: ErpAula[] = (() => {
  const list: ErpAula[] = [];
  const cursos: ErpCurso[] = rawData.cursos ?? [];

  for (const curso of cursos) {
    for (const mod of curso.modulos ?? []) {
      for (const aula of mod.aulas ?? []) {
        list.push({
          curso: curso.nome,
          modulo: mod.nome,
          titulo: aula.titulo,
          resumo: aula.resumo,
          cobertura: aula.cobertura,
        });
      }
    }
  }
  return list;
})();

const STOPWORDS = new Set([
  "a","o","as","os","de","da","do","das","dos","e","ou","para","por","com","sem","um","uma","uns","umas",
  "que","qual","quais","como","onde","quando","porque","por que","se","na","no","nas","nos","em","ao","aos",
  "is","the","and","or","of","to","for","on","in","at","by","with","what","how","when","where","why",
]);

function normalizeText(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bnfc-e\b|\bnfc\s*e\b/g, "nfce")
    .replace(/\bnf-e\b|\bnf\s*e\b/g, "nfe")
    .replace(/\bnfs-e\b|\bnfs\s*e\b/g, "nfse")
    .replace(/\bct-e\b|\bct\s*e\b/g, "cte")
    .replace(/\bmdf-e\b|\bmdf\s*e\b/g, "mdfe");
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

// Pré-computa tokens de cada aula
const INDEXED_AULAS = ERP_AULAS.map((a) => ({
  aula: a,
  titTokens: new Set(tokenize(a.titulo)),
  modTokens: new Set(tokenize(a.modulo)),
  resTokens: new Set(tokenize(a.resumo)),
  cursoTokens: new Set(tokenize(a.curso)),
}));

export function searchErpAulas(query: string, maxResults = 3): ErpAula[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const scored = INDEXED_AULAS.map(({ aula, titTokens, modTokens, resTokens, cursoTokens }) => {
    let score = 0;
    for (const token of queryTokens) {
      if (titTokens.has(token)) score += 9;
      if (modTokens.has(token)) score += 5;
      if (cursoTokens.has(token)) score += 3;
      if (resTokens.has(token)) score += 1;
    }

    // Leve preferência para conteúdos com passo a passo detalhado
    if (aula.cobertura === "detalhado") {
      score += 0.5;
    }

    return { aula, score };
  });

  return scored
    .filter((item) => item.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((item) => item.aula);
}

export function getErpKnowledgeContext(query: string, maxItems = 2): string {
  const results = searchErpAulas(query, maxItems);
  if (results.length === 0) return "";

  return results
    .map((r) => {
      return `### MANUAL OFICIAL DO SISTEMA ERP — ${r.titulo}
- **Sistema / Módulo:** ${r.curso} › ${r.modulo}
- **Tipo de Cobertura:** ${r.cobertura ?? "detalhado"}
- **Passo a Passo e Instruções Oficiais:**
${r.resumo}`;
    })
    .join("\n\n---\n\n");
}
