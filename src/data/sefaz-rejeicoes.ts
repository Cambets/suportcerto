import SEFAZ_DATA_RAW from "./sefaz-rejeicoes.json";

export interface SefazRejeicao {
  codigo: string;
  categoria: string;
  modelos: string;
  mensagem_oficial_sefaz: string;
  causa_provavel: string;
  como_resolver: string;
  passo_a_passo_erp: string;
}

export interface SefazConceito {
  titulo: string;
  secao: string;
  conteudo: Record<string, string>;
}

export interface SefazDatabase {
  titulo: string;
  gerado_em: string;
  fonte_md: string;
  nota_chunking: string;
  total_codigos: number;
  conceitos: SefazConceito[];
  codigos: SefazRejeicao[];
}

const rawData = SEFAZ_DATA_RAW as any;

export const SEFAZ_METADATA = {
  titulo: rawData.titulo ?? "Rejeições e eventos da SEFAZ",
  gerado_em: rawData.gerado_em ?? "2026-10-21",
  fonte_md: rawData.fonte_md ?? "RELATORIO_SEFAZ_REJEICOES.md",
  total_codigos: rawData.total_codigos ?? (Array.isArray(rawData) ? rawData.length : rawData.codigos?.length ?? 0),
};

export const SEFAZ_CONCEITOS: SefazConceito[] = Array.isArray(rawData)
  ? []
  : (rawData.conceitos as SefazConceito[]) ?? [];

export const SEFAZ_REJEICOES: SefazRejeicao[] = Array.isArray(rawData)
  ? (rawData as SefazRejeicao[])
  : (rawData.codigos as SefazRejeicao[]) ?? [];

export const SEFAZ_CATEGORIAS = [
  "Todas",
  "Dados do emitente e destinatário",
  "Numeração, série e chave de acesso",
  "Valores, totais e impostos",
  "Certificado digital e assinatura",
  "Autorização, contingência e inutilização",
  "Eventos (cancelamento, carta de correção)",
  "NFC-e específicos (modelo 65)",
  "Denegação vs Rejeição — diferenças e tratamento",
] as const;

export function findRejeicaoByCode(codigo: string): SefazRejeicao | undefined {
  const clean = codigo.replace(/\D/g, "").trim();
  if (!clean) return undefined;
  return SEFAZ_REJEICOES.find((r) => r.codigo === clean);
}

export function searchRejeicoes(query: string, categoria?: string): SefazRejeicao[] {
  const q = query.toLowerCase().trim();
  return SEFAZ_REJEICOES.filter((r) => {
    if (categoria && categoria !== "Todas" && r.categoria !== categoria) {
      return false;
    }
    if (!q) return true;
    return (
      r.codigo.toLowerCase().includes(q) ||
      r.mensagem_oficial_sefaz.toLowerCase().includes(q) ||
      r.causa_provavel.toLowerCase().includes(q) ||
      r.como_resolver.toLowerCase().includes(q) ||
      r.passo_a_passo_erp.toLowerCase().includes(q) ||
      r.categoria.toLowerCase().includes(q) ||
      r.modelos.toLowerCase().includes(q)
    );
  });
}
