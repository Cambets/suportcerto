import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { consultarViabilidadeMarca } from "@/services/infosimplesService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ArrowLeft,
  History,
  FileDown,
  WifiOff,
  ShieldAlert,
  Sparkles,
  CircleDot,
  ChevronRight,
  Lightbulb,
  FileText,
  Scale,
  Megaphone,
  Gavel,
  Lock,
  Settings2,
  ChevronDown,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import Fuse from "fuse.js";

export const Route = createFileRoute("/inpi")({
  component: ConsultaINPI,
});

type SearchMode = "exato" | "radical" | "booleana" | "fuzzy" | "fonetica";

type EngineSettings = {
  radical: boolean;
  booleana: boolean;
  fuzzy: boolean;
  fonetica: boolean;
};

const DEFAULT_ENGINES: EngineSettings = {
  radical: true,
  booleana: true,
  fuzzy: true,
  fonetica: true,
};

type Status = "green" | "yellow" | "red" | "error";

type Despacho = {
  codigo: string;
  nome: string;
  data: string;
  texto?: string;
  tipo?: "conflito" | "normal";
};

type Gravidade = "critico" | "moderado" | "baixo";

type ValidationSummary = {
  conclusive: boolean;
  level: "oficial" | "ressalva" | "inconclusiva";
  warnings: string[];
  evidence: string[];
};

type ApiObject = Record<string, unknown>;

type ProcessoColidente = {
  processo: string;
  marca: string;
  titular: string;
  classe: string;
  especificacao: string;
  situacao: string;
  situacaoTipo: "registrada" | "exame" | "arquivada" | "oposicao" | "indeferido" | "pendente";
  dataDeposito: string;
  dataPublicacao?: string;
  apresentacao?: string;
  natureza?: string;
  procurador?: string;
  vigencia?: string;
  prioridade?: string;
  cnpjTitular?: string;
  paisTitular?: string;
  // Campos adicionais coletados do payload Infosimples/INPI
  numeroRegistro?: string;
  urlProcesso?: string;
  urlImagem?: string;
  edicaoRPI?: string;
  proximaPublicacao?: string;
  traducao?: string;
  corReivindicada?: string;
  ufTitular?: string;
  cidadeTitular?: string;
  enderecoTitular?: string;
  cotitulares?: string[];
  classesDetalhadas?: { codigo: string; especificacao?: string }[];
  prioridadesUnionistas?: { pais?: string; numero?: string; data?: string }[];
  despachos?: Despacho[];
  ultimoDespacho?: Despacho;
  score?: number;
  matchType?: "radical" | "parcial" | "fonetica";
  matches?: SearchMode[];
  validado?: boolean;
  timeline: { etapa: string; data: string; concluida: boolean }[];
  notaIA: string;
  // Diagnóstico de colidência
  motivoConflito?: string;
  baseLegal?: string;
  gravidade?: Gravidade;
  scriptVendas?: string;
  raw?: ApiObject;
};

type ResultState = {
  status: Status;
  marca: string;
  classe: string;
  total: number;
  items: ProcessoColidente[];
  fallback?: boolean;
  timestamp: number;
  // Diagnóstico para auditoria jurídica
  source?: "api" | "contingencia";
  apiCode?: number | string;
  apiMessage?: string;
  rawCount?: number;
  durationMs?: number;
  errorMsg?: string;
  validation?: ValidationSummary;
};

// Sem timeout no cliente — Infosimples cobra crédito ao disparar; aguardamos a resposta completa.
const HISTORY_KEY = "inpi:history";

// ============ MOCK DATA ============
const MOCK_COLIDENCIAS: ProcessoColidente[] = [
  {
    processo: "923456789",
    marca: "Certifica Mais",
    titular: "Alfa Distribuidora Ltda",
    classe: "35",
    especificacao: "Serviços de consultoria empresarial e gestão de negócios",
    situacao: "Indeferido — Imitação de marca",
    situacaoTipo: "indeferido",
    dataDeposito: "12/03/2019",
    dataPublicacao: "08/10/2020",
    apresentacao: "Nominativa",
    natureza: "Serviço",
    cnpjTitular: "12.345.678/0001-90",
    paisTitular: "BR",
    motivoConflito: "Imitação de Marca Registrada de Terceiro",
    baseLegal:
      "Infringência ao Art. 124, Inciso XIX da Lei 9.279/96 (LPI) — reprodução suscetível de causar confusão.",
    gravidade: "critico",
    scriptVendas:
      "A concorrente 'Alfa Distribuidora' já garantiu prioridade desse nome na mesma classe (35). O INPI já indeferiu pedidos idênticos por imitação — tentar de novo é desperdício de taxa. Posicione o cliente para um nome alternativo agora e feche o contrato com segurança jurídica.",
    despachos: [
      {
        codigo: "100",
        nome: "Pedido de registro depositado",
        data: "12/03/2019",
        tipo: "normal",
        texto: "Pedido protocolado na classe 35.",
      },
      {
        codigo: "338",
        nome: "Exigência formal — apresentar procuração",
        data: "20/06/2019",
        tipo: "normal",
        texto: "INPI solicitou regularização documental do procurador.",
      },
      {
        codigo: "610",
        nome: "Indeferimento do pedido",
        data: "08/10/2020",
        tipo: "conflito",
        texto:
          "Marca indeferida com base no Art. 124, XIX da LPI: reprodução/imitação de marca anteriormente registrada de terceiro para distinguir produto/serviço idêntico, semelhante ou afim, suscetível de causar confusão ou associação no consumidor.",
      },
    ],
    ultimoDespacho: {
      codigo: "610",
      nome: "Indeferimento por imitação",
      data: "08/10/2020",
      tipo: "conflito",
      texto:
        "Marca indeferida — Art. 124, XIX LPI. Risco de confusão com registro anterior de Alfa Distribuidora.",
    },
    timeline: [
      { etapa: "Depósito", data: "12/03/2019", concluida: true },
      { etapa: "Publicação", data: "20/05/2019", concluida: true },
      { etapa: "Exame de mérito", data: "15/01/2020", concluida: true },
      { etapa: "Indeferimento (Art. 124, XIX)", data: "08/10/2020", concluida: true },
    ],
    notaIA:
      "INPI já indeferiu pedido idêntico por imitação de 'Alfa Distribuidora'. Reprotocolar resultará em nova rejeição. Sugira variação ao cliente.",
  },
  {
    processo: "918234567",
    marca: "Certificare",
    titular: "Beta Indústria S/A",
    classe: "41",
    especificacao: "Serviços de educação e treinamento profissional",
    situacao: "Em exame — Oposição ativa",
    situacaoTipo: "oposicao",
    dataDeposito: "22/07/2023",
    apresentacao: "Mista",
    natureza: "Serviço",
    cnpjTitular: "98.765.432/0001-10",
    paisTitular: "BR",
    motivoConflito: "Notificação de Oposição Ativa por Terceiro",
    baseLegal:
      "Oposição protocolada nos termos do Art. 158 da LPI — suspende a concessão até decisão administrativa.",
    gravidade: "moderado",
    scriptVendas:
      "A marca está em disputa: 'Beta Indústria' protocolou oposição formal alegando colidência. O processo NÃO está rejeitado, mas há litígio em curso. Cliente pode tentar, porém com risco de gastar taxa e perder. O caminho seguro é diferenciar o nome agora — feche o contrato com uma alternativa que não enfrenta oposição.",
    despachos: [
      {
        codigo: "100",
        nome: "Pedido depositado",
        data: "22/07/2023",
        tipo: "normal",
        texto: "Pedido recebido pelo INPI na classe 41.",
      },
      {
        codigo: "200",
        nome: "Publicação para oposição",
        data: "05/09/2023",
        tipo: "normal",
        texto: "Publicado na RPI 2748 abrindo prazo de 60 dias para oposições.",
      },
      {
        codigo: "337",
        nome: "Oposição apresentada por terceiro",
        data: "28/10/2023",
        tipo: "conflito",
        texto:
          "Beta Indústria S/A protocolou oposição alegando colidência com seu registro anterior nº 812.345.678 (classe 41), com risco de confusão entre serviços educacionais.",
      },
    ],
    ultimoDespacho: {
      codigo: "337",
      nome: "Oposição ativa — Beta Indústria",
      data: "28/10/2023",
      tipo: "conflito",
      texto: "Processo em litígio administrativo. Aguardando manifestação do depositante.",
    },
    timeline: [
      { etapa: "Depósito", data: "22/07/2023", concluida: true },
      { etapa: "Publicação", data: "05/09/2023", concluida: true },
      { etapa: "Oposição protocolada", data: "28/10/2023", concluida: true },
      { etapa: "Decisão de mérito", data: "—", concluida: false },
    ],
    notaIA:
      "Marca enfrenta oposição ativa da Beta Indústria. Risco moderado — disputável, mas custoso. Avaliar variação fonética.",
  },
  {
    processo: "905671234",
    marca: "Certifica+",
    titular: "Antiga Marca Brasil S/A",
    classe: "35",
    especificacao: "Consultoria administrativa (registro extinto por caducidade)",
    situacao: "Arquivada",
    situacaoTipo: "arquivada",
    dataDeposito: "10/02/2012",
    dataPublicacao: "18/06/2013",
    motivoConflito: "Registro extinto por caducidade",
    baseLegal: "Art. 142, III da LPI — caducidade por falta de uso comprovado.",
    gravidade: "baixo",
    scriptVendas:
      "Esse registro está extinto há mais de 12 meses. Risco comercial baixíssimo. Pode seguir, mas convém aguardar o período de quarentena legal (5 anos) para blindar contra reativação do antigo titular.",
    ultimoDespacho: {
      codigo: "365",
      nome: "Arquivamento por caducidade",
      data: "30/01/2024",
      tipo: "normal",
      texto: "Registro extinto — titular não comprovou uso efetivo nos últimos 5 anos.",
    },
    timeline: [
      { etapa: "Depósito", data: "10/02/2012", concluida: true },
      { etapa: "Publicação", data: "18/06/2013", concluida: true },
      { etapa: "Concessão", data: "22/11/2013", concluida: true },
      { etapa: "Caducidade / Arquivamento", data: "30/01/2024", concluida: true },
    ],
    notaIA:
      "Registro arquivado por caducidade — não está mais ativo. Risco BAIXO, mas convém aguardar 5 anos do arquivamento para evitar reativação.",
  },
  {
    processo: "911223344",
    marca: "CASA",
    titular: "Casa Brasil Comércio Ltda",
    classe: "35",
    especificacao: "Comércio varejista e serviços de gestão de loja",
    situacao: "Registrada — em vigor",
    situacaoTipo: "registrada",
    dataDeposito: "05/08/2010",
    dataPublicacao: "12/02/2011",
    apresentacao: "Nominativa",
    natureza: "Serviço",
    cnpjTitular: "11.222.333/0001-44",
    paisTitular: "BR",
    motivoConflito: "Colidência fonética — pronúncia idêntica",
    baseLegal: "Art. 124, XIX da LPI — reprodução fonética de marca registrada anterior.",
    gravidade: "critico",
    scriptVendas:
      "A pronúncia da marca pretendida é idêntica a 'CASA', já registrada por terceiro na mesma classe. O INPI considera reprodução fonética como colidência, mesmo com grafia diferente (Kaza/Kasa/Caza). Recomende variação ao cliente.",
    ultimoDespacho: {
      codigo: "303",
      nome: "Registro concedido",
      data: "12/02/2011",
      tipo: "normal",
      texto: "Marca registrada e em pleno vigor.",
    },
    timeline: [
      { etapa: "Depósito", data: "05/08/2010", concluida: true },
      { etapa: "Publicação", data: "20/10/2010", concluida: true },
      { etapa: "Concessão", data: "12/02/2011", concluida: true },
    ],
    notaIA:
      "Marca CASA já registrada. Variações fonéticas (Kaza, Kasa, Caza) caem no Art. 124, XIX. Risco ALTO.",
  },
];

function sameClasse(itemClasse: string, classe: string): boolean {
  if (!classe) return true;
  const target = String(classe).replace(/\D/g, "");
  if (!target) return true;
  return String(itemClasse)
    .split(/[,;/|\s]+/)
    .map((v) => v.replace(/\D/g, ""))
    .filter(Boolean)
    .includes(target);
}

function classify(items: ProcessoColidente[], classe: string): Status {
  if (!items || items.length === 0) return "green";
  const matchClasse = (it: ProcessoColidente) => sameClasse(it.classe, classe);
  const critico = items.some(
    (it) =>
      (it.situacaoTipo === "registrada" ||
        it.situacaoTipo === "indeferido" ||
        it.gravidade === "critico") &&
      matchClasse(it),
  );
  if (critico) return "red";
  return "yellow";
}

function asObject(value: unknown): ApiObject | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ApiObject)
    : undefined;
}

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (value == null) continue;
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();
      if (text) return text;
    }
    const objectValue = asObject(value);
    if (objectValue) {
      const text = firstText(
        objectValue.nome,
        objectValue.descricao,
        objectValue.codigo,
        objectValue.valor,
        objectValue.texto,
      );
      if (text) return text;
    }
  }
  return undefined;
}

function normalizeClasseValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const joined = value
      .map((v) => normalizeClasseValue(v))
      .filter(Boolean)
      .join(", ");
    return joined || undefined;
  }
  const objectValue = asObject(value);
  return firstText(
    objectValue?.classe,
    objectValue?.codigo,
    objectValue?.ncl,
    objectValue?.numero,
    objectValue?.id,
    value,
  );
}

function objectArray(value: unknown): ApiObject[] {
  return Array.isArray(value) ? value.map(asObject).filter((v): v is ApiObject => Boolean(v)) : [];
}

function normalizeApiItem(it: ApiObject): ProcessoColidente {
  const classes = it.classes ?? it.classe_nice_lista ?? it.ncls ?? it.ncl_lista;
  const classeNormalizada = normalizeClasseValue(
    it.classe ?? it.classe_nice ?? it.ncl ?? it.codigo_classe ?? classes,
  );
  const especificacaoClasse = firstText(
    it.especificacao,
    it.descricao,
    it.especificacao_produtos_servicos,
    it.produtos_servicos,
    objectArray(classes)
      .map((c) => firstText(c.especificacao, c.descricao))
      .filter(Boolean)
      .join("; "),
  );
  const situacao = firstText(it.situacao, it.situacao_atual, it.status, it.status_processo) ?? "";
  const lower = situacao.toLowerCase();
  let tipo: ProcessoColidente["situacaoTipo"] = "pendente";
  if (lower.includes("registr") || lower.includes("vigor")) tipo = "registrada";
  else if (lower.includes("exame")) tipo = "exame";
  else if (lower.includes("arquiv") || lower.includes("caduc") || lower.includes("extint"))
    tipo = "arquivada";
  else if (lower.includes("oposi")) tipo = "oposicao";
  else if (lower.includes("indefer")) tipo = "indeferido";

  // Despachos / andamentos (variações no payload da Infosimples)
  const rawDespachos = objectArray(
    it.despachos ?? it.andamentos ?? it.historico ?? it.protocolos ?? it.publicacoes,
  );
  const despachos = rawDespachos.map((d) => ({
    codigo: firstText(d.codigo, d.code, d.cod_despacho) ?? "—",
    nome: firstText(d.nome, d.descricao, d.titulo, d.despacho) ?? "—",
    data: firstText(d.data, d.data_publicacao, d.data_rpi) ?? "—",
    texto: firstText(d.texto, d.complemento, d.observacao, d.descricao),
    tipo: /indefer|oposi|colid|imita|anterioridade|124|xix/i.test(
      `${firstText(d.nome, d.descricao, d.titulo, d.despacho, d.texto) ?? ""}`,
    )
      ? "conflito"
      : "normal",
  })) as Despacho[];
  const ultimoDespacho = despachos[despachos.length - 1];

  return {
    processo: firstText(it.processo, it.numero_processo, it.numero, it.pedido, it.id) ?? "—",
    marca: firstText(it.marca, it.nome_marca, it.denominacao, it.nome) ?? "—",
    titular:
      firstText(it.titular, it.nome_titular, it.requerente, it.depositante) ??
      "Titular não informado",
    classe: classeNormalizada ?? "-",
    especificacao: especificacaoClasse ?? "—",
    situacao: situacao || "Pendente",
    situacaoTipo: tipo,
    dataDeposito: firstText(it.data_deposito, it.dataDeposito, it.deposito) ?? "—",
    dataPublicacao: firstText(it.data_publicacao, it.dataPublicacao, it.publicacao),
    apresentacao: firstText(it.apresentacao, it.tipo_apresentacao),
    natureza: firstText(it.natureza, it.tipo_marca),
    procurador: firstText(it.procurador, it.nome_procurador),
    vigencia: firstText(it.vigencia, it.data_vigencia, it.data_concessao),
    prioridade: firstText(it.prioridade),
    cnpjTitular: firstText(it.cnpj_titular, it.cpf_cnpj_titular, it.documento_titular),
    paisTitular: firstText(it.pais_titular, it.pais),
    numeroRegistro: firstText(it.numero_registro, it.registro, it.nro_registro),
    urlProcesso: firstText(it.url_processo, it.url, it.link_processo, it.site_receipt),
    urlImagem: firstText(it.url_imagem, it.imagem, it.imagem_marca, it.logo, it.figura),
    edicaoRPI: firstText(it.edicao_rpi, it.rpi, it.numero_rpi),
    proximaPublicacao: firstText(it.proxima_publicacao, it.data_proxima_publicacao),
    traducao: firstText(it.traducao, it.traducao_marca),
    corReivindicada: firstText(it.cor_reivindicada, it.cores_reivindicadas, it.cores),
    ufTitular: firstText(it.uf_titular, it.estado_titular, it.uf),
    cidadeTitular: firstText(it.cidade_titular, it.cidade),
    enderecoTitular: firstText(it.endereco_titular, it.endereco),
    cotitulares: objectArray(it.cotitulares ?? it.titulares ?? it.outros_titulares)
      .map((t) => firstText(t.nome, t.nome_titular, t.titular, t.razao_social))
      .filter((v): v is string => Boolean(v)),
    classesDetalhadas: objectArray(classes).map((c) => ({
      codigo: firstText(c.codigo, c.classe, c.ncl, c.classe_nice) ?? "—",
      especificacao: firstText(c.especificacao, c.descricao, c.produtos_servicos),
    })),
    prioridadesUnionistas: objectArray(
      it.prioridades ?? it.prioridades_unionistas ?? it.prioridade_unionista,
    ).map((p) => ({
      pais: firstText(p.pais, p.pais_origem, p.country),
      numero: firstText(p.numero, p.numero_prioridade, p.processo),
      data: firstText(p.data, p.data_prioridade),
    })),
    despachos: despachos.length ? despachos : undefined,
    ultimoDespacho,
    motivoConflito:
      tipo === "registrada"
        ? "Registro ativo encontrado no JSON oficial do INPI"
        : tipo === "indeferido"
          ? "Pedido já indeferido pelo INPI"
          : tipo === "oposicao"
            ? "Processo com oposição registrada"
            : undefined,
    gravidade:
      tipo === "registrada" || tipo === "indeferido"
        ? "critico"
        : tipo === "oposicao" || tipo === "exame"
          ? "moderado"
          : "baixo",
    timeline: [
      {
        etapa: "Depósito",
        data: firstText(it.data_deposito, it.dataDeposito, it.deposito) ?? "—",
        concluida: Boolean(firstText(it.data_deposito, it.dataDeposito, it.deposito)),
      },
      {
        etapa: "Publicação",
        data: firstText(it.data_publicacao, it.dataPublicacao, it.publicacao) ?? "—",
        concluida: Boolean(firstText(it.data_publicacao, it.dataPublicacao, it.publicacao)),
      },
      { etapa: "Exame", data: "—", concluida: tipo === "registrada" },
      {
        etapa: "Concessão",
        data: tipo === "registrada" ? "Concedida" : "—",
        concluida: tipo === "registrada",
      },
    ],
    notaIA:
      tipo === "registrada"
        ? "Marca ativa e concedida pelo INPI. Risco ALTO de colidência — orientar variação."
        : tipo === "arquivada"
          ? "Registro inativo. Baixo risco comercial, mas validar com jurídico."
          : "Processo em andamento — possível protocolar com estratégia de oposição.",
    raw: it,
  };
}

function looksLikeInpiProcess(value: unknown): value is ApiObject {
  const objectValue = asObject(value);
  if (!objectValue) return false;
  const keys = Object.keys(objectValue);
  const hasProcess = keys.some((k) => /^(processo|numero_processo|numero|pedido)$/i.test(k));
  const hasBrand = keys.some((k) => /^(marca|nome_marca|denominacao)$/i.test(k));
  const hasLegalContext = keys.some((k) =>
    /classe|ncl|titular|requerente|depositante|situacao|status/i.test(k),
  );
  return hasProcess || (hasBrand && hasLegalContext);
}

function extractInpiRows(payload: unknown): ApiObject[] {
  const skipNested = new Set([
    "despachos",
    "andamentos",
    "historico",
    "protocolos",
    "publicacoes",
    "classes",
  ]);
  const out: ApiObject[] = [];
  const seen = new Set<string>();

  function collect(value: unknown, depth = 0) {
    if (value == null || depth > 5) return;
    if (Array.isArray(value)) {
      const direct = value.filter(looksLikeInpiProcess);
      if (direct.length) {
        direct.forEach((row) => {
          const key = JSON.stringify([
            firstText(row.processo, row.numero_processo, row.numero, row.pedido),
            firstText(row.marca, row.nome_marca, row.denominacao),
            firstText(row.classe, row.ncl, row.classe_nice),
          ]);
          if (!seen.has(key)) {
            seen.add(key);
            out.push(row);
          }
        });
        return;
      }
      value.forEach((item) => collect(item, depth + 1));
      return;
    }
    const objectValue = asObject(value);
    if (objectValue) {
      if (looksLikeInpiProcess(objectValue)) {
        const key = JSON.stringify([
          firstText(
            objectValue.processo,
            objectValue.numero_processo,
            objectValue.numero,
            objectValue.pedido,
          ),
          firstText(objectValue.marca, objectValue.nome_marca, objectValue.denominacao),
          firstText(objectValue.classe, objectValue.ncl, objectValue.classe_nice),
        ]);
        if (!seen.has(key)) {
          seen.add(key);
          out.push(objectValue);
        }
        return;
      }
      Object.entries(objectValue).forEach(([key, child]) => {
        if (!skipNested.has(key)) collect(child, depth + 1);
      });
    }
  }

  const root = asObject(payload);
  collect(root?.data ?? root?.result ?? root?.results ?? payload);
  return out;
}

function hasStructuredDataEnvelope(payload: unknown): boolean {
  const root = asObject(payload);
  return Boolean(root && ("data" in root || "result" in root || "results" in root));
}

function validateInpiJson(
  payload: unknown,
  rows: ApiObject[],
  rawItems: ProcessoColidente[],
  matchedItems: ProcessoColidente[],
): ValidationSummary {
  const warnings: string[] = [];
  const evidence: string[] = [];
  if (!hasStructuredDataEnvelope(payload)) {
    return {
      conclusive: false,
      level: "inconclusiva",
      warnings: ["Resposta 200 sem envelope JSON de dados reconhecido; a marca não será liberada."],
      evidence,
    };
  }

  const root = asObject(payload);
  evidence.push(
    `code=${String(root?.code ?? "200")} recebido; ${rows.length} registro(s) bruto(s) reconhecido(s).`,
  );
  if (rows.length === 0) {
    return {
      conclusive: true,
      level: "oficial",
      warnings,
      evidence: [...evidence, "Nenhum processo de marca foi retornado no JSON oficial."],
    };
  }

  const invalidRows = rawItems.filter((it) => it.processo === "—" || it.marca === "—").length;
  if (invalidRows) warnings.push(`${invalidRows} registro(s) retornado(s) com processo ou marca incompletos no JSON.`);
  if (matchedItems.length === 0) {
    warnings.push("O INPI retornou processos, mas nenhum foi confirmado pelos motores locais; não liberar automaticamente.");
  }

  return {
    conclusive: invalidRows < rawItems.length,
    level: warnings.length ? "ressalva" : "oficial",
    warnings,
    evidence: [...evidence, `${matchedItems.length} colidência(s) confirmada(s) pelos motores Exato/Radical, Booleano, Fuse ou Fonético.`],
  };
}

// ============ FILTROS BOOLEANO + FONÉTICO (FUSE) ============
// Booleano: suporta AND, OR, NOT (uppercase) e aspas para frases.
// Ex.: certifica AND mais NOT antiga / consultoria OR auditoria
function tokenize(query: string): string[] {
  const re = /"([^"]+)"|(\S+)/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(query))) out.push((m[1] ?? m[2]).toLowerCase());
  return out;
}

function matchBoolean(query: string, haystack: string): boolean {
  if (!query.trim()) return true;
  const text = haystack.toLowerCase();
  // Divide por OR (qualquer grupo verdadeiro basta)
  const orGroups = query.split(/\s+OR\s+/i);
  return orGroups.some((group) => {
    const tokens = tokenize(group);
    return tokens.every((tok, i) => {
      if (tok === "and" || tok === "or") return true;
      if (tok === "not") return true;
      const prev = tokens[i - 1];
      const neg = prev === "not";
      const hit = text.includes(tok);
      return neg ? !hit : hit;
    });
  });
}

// Normaliza removendo acentos, pontuação e caixa — comparação justa marca×marca.
function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Radical por palavra: remove sufixos comuns do PT-BR e devolve raiz mínima de 4 chars.
// Mesma lógica que o INPI usa em "Pesquisa por Radical" — não corta abaixo de 4.
function radicalOf(word: string): string {
  const w = norm(word);
  if (w.length <= 4) return w;
  const stripped = w.replace(
    /(mente|acoes|acao|coes|cao|inho|inha|ismo|ista|aria|eiro|eira|ado|ada|ar|er|ir|es|s)$/,
    "",
  );
  return stripped.length >= 4 ? stripped : w.slice(0, 4);
}

// Verifica se duas strings fonéticas casam de forma estrita.
// Aceita igualdade exata OU contenção como PALAVRA INTEIRA — evita "kasa" ⊂ "kasamento".
function phoneticHit(markPhon: string, qPhon: string): boolean {
  if (!markPhon || !qPhon) return false;
  if (markPhon === qPhon) return true;
  // Diferença de tamanho muito grande = pronúncia distinta.
  const ratio = Math.min(markPhon.length, qPhon.length) / Math.max(markPhon.length, qPhon.length);
  if (ratio < 0.75) return false;
  return levSim(markPhon, qPhon) >= 0.85;
}

// Levenshtein normalizada (0..1) — base da similaridade fonética/grafia.
function levSim(a: string, b: string): number {
  a = norm(a);
  b = norm(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array(n + 1)
    .fill(0)
    .map((_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return 1 - dp[n] / Math.max(m, n);
}


// Encoder fonético PT-BR — colapsa grafias para o mesmo "som".
// Ex: kaza/casa/caza -> "kasa"; xis/chis -> "xis"; quero/kero -> "kero".
function phoneticPT(s: string): string {
  let x = norm(s).replace(/\s+/g, "");
  x = x
    .replace(/ph/g, "f")
    .replace(/ch/g, "x")
    .replace(/lh/g, "ly")
    .replace(/nh/g, "ny")
    .replace(/sh/g, "x")
    .replace(/qu([ei])/g, "k$1")
    .replace(/gu([ei])/g, "g$1")
    .replace(/ce|ci/g, (m) => "s" + m[1])
    .replace(/ge|gi/g, (m) => "j" + m[1])
    .replace(/ç/g, "s")
    .replace(/q/g, "k")
    .replace(/c/g, "k")
    .replace(/z/g, "s")
    .replace(/y/g, "i")
    .replace(/w/g, "v")
    .replace(/h/g, "")
    .replace(/(.)\1+/g, "$1");
  return x;
}

function runAllModes(
  items: ProcessoColidente[],
  query: string,
  engines: EngineSettings = DEFAULT_ENGINES,
): ProcessoColidente[] {
  if (!items.length || !query.trim()) return items;

  const qNorm = norm(query);
  // INPI considera palavras com >=4 caracteres em radical (descarta artigos/preposições curtas).
  const qWords = qNorm.split(" ").filter((w) => w.length >= 4);
  if (!qWords.length) return items;
  const qRadicals = qWords.map(radicalOf).filter((r) => r.length >= 4);
  const qPhonetic = phoneticPT(query);

  // 1) EXATO + RADICAL — APENAS no campo `marca`, espelhando o comportamento do INPI.
  const exatoSet = new Set<string>();
  const radicalSet = new Set<string>();
  if (engines.radical) {
    for (const it of items) {
      const marcaNorm = norm(it.marca);
      if (marcaNorm === qNorm) {
        exatoSet.add(it.processo);
        continue;
      }
      const marcaWords = marcaNorm.split(" ").filter(Boolean);
      // Casa se ALGUMA palavra da marca começa com o radical da consulta (>=4 chars).
      const hit = qRadicals.some((r) =>
        marcaWords.some((mw) => mw.startsWith(r)),
      );
      if (hit) radicalSet.add(it.processo);
    }
  }

  // 2) BOOLEANA — AND / OR / NOT / "frase". Restrito ao campo `marca` para coerência com INPI.
  const booleanaSet = new Set<string>();
  if (engines.booleana) {
    for (const it of items) {
      if (matchBoolean(query, it.marca)) {
        booleanaSet.add(it.processo);
      }
    }
  }

  // 3) FUZZY (Fuse) — tolerância a erros de digitação. Threshold mais estrito (0.3).
  const fuzzyMap = new Map<string, number>();
  if (engines.fuzzy) {
    const fuse = new Fuse(items, {
      keys: ["marca"],
      includeScore: true,
      threshold: 0.3,
      ignoreLocation: true,
      minMatchCharLength: 4,
    });
    for (const r of fuse.search(qNorm)) {
      const sim = levSim(r.item.marca, query);
      // Sobe corte para 0.7 — evita "casa" casar com "cascata" só por proximidade.
      if (sim >= 0.7) fuzzyMap.set(r.item.processo, sim);
    }
  }

  // 4) FONÉTICA — encoder PT-BR estrito (igualdade ou similaridade >=0.85).
  const foneticaSet = new Set<string>();
  if (engines.fonetica) {
    for (const it of items) {
      const mp = phoneticPT(it.marca);
      if (phoneticHit(mp, qPhonetic)) foneticaSet.add(it.processo);
    }
  }

  // Consolida: mantém somente itens que casaram em pelo menos 1 modo ativo
  const enriched: ProcessoColidente[] = [];
  for (const it of items) {
    const matches: SearchMode[] = [];
    if (exatoSet.has(it.processo)) matches.push("exato");
    if (radicalSet.has(it.processo)) matches.push("radical");
    if (booleanaSet.has(it.processo)) matches.push("booleana");
    if (fuzzyMap.has(it.processo)) matches.push("fuzzy");
    if (foneticaSet.has(it.processo)) matches.push("fonetica");
    if (!matches.length) continue;
    const score =
      (matches.includes("exato") ? 1 : 0) ||
      fuzzyMap.get(it.processo) ||
      (matches.includes("radical") ? levSim(it.marca, query) || 0.85 : 0) ||
      (matches.includes("fonetica") ? 0.8 : 0.6);
    const validado =
      matches.includes("exato") ||
      matches.includes("radical") ||
      matches.length >= 2;
    enriched.push({
      ...it,
      matches,
      score,
      matchType: matches.includes("radical") || matches.includes("exato")
        ? "radical"
        : matches.includes("fonetica")
          ? "fonetica"
          : "parcial",
      validado,
    });
  }

  enriched.sort((a, b) => {
    if (!!b.validado !== !!a.validado) return b.validado ? 1 : -1;
    return (b.score ?? 0) - (a.score ?? 0);
  });

  return enriched;
}

function loadHistory(): ResultState[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function ConsultaINPI() {
  const [marca, setMarca] = useState("");
  const [classe, setClasse] = useState("");
  const [engines, setEngines] = useState<EngineSettings>(DEFAULT_ENGINES);
  const [showEngines, setShowEngines] = useState(false);
  const [resultado, setResultado] = useState<ResultState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<ResultState[]>([]);
  const [selected, setSelected] = useState<ProcessoColidente | null>(null);
  const consultaFn = useServerFn(consultarViabilidadeMarca);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  function pushHistory(entry: ResultState) {
    const next = [entry, ...history.filter((h) => h.marca !== entry.marca)].slice(0, 5);
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      void 0;
    }
  }

  async function handleSearch() {
    if (!marca.trim()) {
      toast.error("Digite o nome de uma marca.");
      return;
    }
    setIsLoading(true);
    setResultado(null);

    // SEM timeout no cliente: a Infosimples já cobra crédito assim que dispara a
    // consulta no INPI; abortar do nosso lado só faria perder a resposta paga.
    // Esperamos a conclusão completa para garantir coerência entre custo e dado exibido.
    const t0 = performance.now();
    try {
      const data: unknown = await consultaFn({ data: { marca, classe } });
      const durationMs = Math.round(performance.now() - t0);

      // 🔎 LOG completo para auditoria — abra o DevTools (F12) para inspecionar.
      console.groupCollapsed(
        `[INPI] resposta crua • ${marca}${classe ? ` (cl. ${classe})` : ""} • ${durationMs}ms`,
      );
      console.log("payload:", data);
      console.groupEnd();

      const dataRoot = asObject(data);
      const apiCode = dataRoot?.code;
      const apiMessage = firstText(dataRoot?.code_message, dataRoot?.message);

      // code=200 indica apenas consulta concluída; a liberação depende do JSON analisado abaixo.
      if (apiCode !== undefined && apiCode !== 200 && apiCode !== "200") {
        throw new Error(`INPI/Infosimples retornou code=${apiCode}: ${apiMessage ?? "sem mensagem"}`);
      }

      const raw = extractInpiRows(data);
      const rawItems: ProcessoColidente[] = raw.map(normalizeApiItem);
      const matchedItems = runAllModes(rawItems, marca, engines);
      const validation = validateInpiJson(data, raw, rawItems, matchedItems);
      if (!validation.conclusive) {
        throw new Error(validation.warnings.join(" ") || "JSON do INPI sem dados suficientes para validar a pesquisa.");
      }
      const items = matchedItems.length
        ? matchedItems
        : rawItems.map((it) => ({
            ...it,
            score: levSim(it.marca, marca),
            matchType: "parcial" as const,
            validado: false,
            motivoConflito: it.motivoConflito ?? "Processo retornado pelo JSON oficial do INPI, pendente de confirmação pelos motores locais.",
            gravidade: it.gravidade ?? "moderado",
          }));
      const status = raw.length > 0 && matchedItems.length === 0 ? "yellow" : classify(items, classe);

      const entry: ResultState = {
        status,
        marca,
        classe,
        total: items.length,
        items,
        timestamp: Date.now(),
        source: "api",
        apiCode,
        apiMessage,
        rawCount: raw.length,
        durationMs,
        validation,
      };
      setResultado(entry);
      pushHistory(entry);
      const validados = items.filter((i) => i.validado).length;
      if (raw.length === 0) {
        toast.success(
          `INPI consultado em ${durationMs}ms — JSON oficial sem processos retornados.`,
        );
      } else if (matchedItems.length === 0) {
        toast.warning(
          `INPI retornou ${raw.length} processo(s), mas sem validação local plena. Resultado com ressalva jurídica.`,
        );
      } else {
        toast.success(
          `INPI ok (${raw.length} brutos → ${items.length} colidências, ${validados} validadas) em ${durationMs}ms.`,
        );
      }
    } catch (error: unknown) {
      const durationMs = Math.round(performance.now() - t0);
      console.error("[INPI] falha na consulta:", error);
      const errorMessage = error instanceof Error ? error.message : "Falha desconhecida ao consultar o INPI.";
      const entry: ResultState = {
        // NUNCA marcar como "green" (livre) em falha — usuário precisa saber que não concluiu.
        status: "error",
        marca,
        classe,
        total: 0,
        items: [],
        fallback: true,
        timestamp: Date.now(),
        source: "contingencia",
        errorMsg: errorMessage,
        durationMs,
      };
      setResultado(entry);
      // Não persistimos consultas inconclusivas no histórico para evitar confusão futura.
      toast.error(`Falha ao consultar o INPI: ${errorMessage}.`);
    } finally {
      setIsLoading(false);
    }
  }

  function exportPDF() {
    if (!resultado) return;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 14;
    const maxW = pageW - marginX * 2;
    let y = 20;

    const label =
      resultado.status === "green"
        ? "CAMINHO LIVRE"
        : resultado.status === "yellow"
          ? "LIVRE COM RESSALVAS"
          : resultado.status === "red"
            ? "MARCA INVIÁVEL"
            : "CONSULTA INCONCLUSIVA";

    const ensure = (need: number) => {
      if (y + need > pageH - 15) {
        doc.addPage();
        y = 20;
      }
    };
    const writeLine = (text: string, size = 10, color: [number, number, number] = [0, 0, 0]) => {
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, maxW);
      ensure(lines.length * (size * 0.45) + 2);
      doc.text(lines, marginX, y);
      y += lines.length * (size * 0.45) + 2;
    };

    // Cabeçalho
    doc.setFontSize(18);
    doc.text("Relatório de Viabilidade de Marca", marginX, y);
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Emitido em ${new Date(resultado.timestamp).toLocaleString("pt-BR")}`, marginX, y);
    y += 6;
    doc.setDrawColor(200);
    doc.line(marginX, y, pageW - marginX, y);
    y += 6;
    doc.setTextColor(0);

    writeLine(`Marca: ${resultado.marca}`, 12);
    writeLine(`Classe: ${resultado.classe || "Não informada"}`, 12);
    writeLine(`Status: ${label}`, 12);
    writeLine(`Registros encontrados: ${resultado.total}`, 12);
    if (resultado.fallback) {
      writeLine("⚠ Resultado baseado em contingência (INPI indisponível).", 11, [180, 100, 0]);
    }

    y += 4;
    doc.setDrawColor(200);
    doc.line(marginX, y, pageW - marginX, y);
    y += 6;

    writeLine(`Processos relacionados (${resultado.items.length}):`, 13);
    y += 2;

    resultado.items.forEach((it, i) => {
      ensure(40);
      // Caixa de separação
      doc.setDrawColor(220);
      doc.line(marginX, y, pageW - marginX, y);
      y += 4;
      writeLine(`${i + 1}. ${it.marca || "(sem marca)"} — Processo ${it.processo || "N/D"}`, 11);
      writeLine(`Status: ${it.situacao || "N/D"} [${it.situacaoTipo}]`, 10, [60, 60, 60]);
      if (it.titular) writeLine(`Titular: ${it.titular}`);
      if (it.classe) writeLine(`Classe NCL: ${it.classe}`);
      if (it.especificacao) writeLine(`Especificação: ${it.especificacao}`);
      if (it.natureza) writeLine(`Natureza: ${it.natureza}`);
      if (it.apresentacao) writeLine(`Apresentação: ${it.apresentacao}`);
      if (it.dataDeposito) writeLine(`Data depósito: ${it.dataDeposito}`);
      if (it.dataPublicacao) writeLine(`Data publicação: ${it.dataPublicacao}`);
      if (it.vigencia) writeLine(`Vigência: ${it.vigencia}`);
      if (it.numeroRegistro) writeLine(`Nº registro: ${it.numeroRegistro}`);
      if (it.edicaoRPI) writeLine(`Edição RPI: ${it.edicaoRPI}`);
      if (it.proximaPublicacao) writeLine(`Próxima publicação: ${it.proximaPublicacao}`);
      if (it.procurador) writeLine(`Procurador: ${it.procurador}`);
      if (it.cnpjTitular) writeLine(`CNPJ titular: ${it.cnpjTitular}`);
      if (it.paisTitular) writeLine(`País titular: ${it.paisTitular}`);
      if (it.ufTitular || it.cidadeTitular)
        writeLine(`Local titular: ${[it.cidadeTitular, it.ufTitular].filter(Boolean).join("/")}`);
      if (it.enderecoTitular) writeLine(`Endereço: ${it.enderecoTitular}`);
      if (it.cotitulares?.length) writeLine(`Cotitulares: ${it.cotitulares.join("; ")}`);
      if (it.traducao) writeLine(`Tradução: ${it.traducao}`);
      if (it.corReivindicada) writeLine(`Cor reivindicada: ${it.corReivindicada}`);
      if (it.prioridade) writeLine(`Prioridade: ${it.prioridade}`);
      if (it.prioridadesUnionistas?.length) {
        writeLine(
          `Prioridades unionistas: ${it.prioridadesUnionistas
            .map((p) => `${p.pais || "?"} ${p.numero || ""} ${p.data || ""}`.trim())
            .join("; ")}`,
        );
      }
      if (it.classesDetalhadas?.length) {
        writeLine(
          `Classes detalhadas: ${it.classesDetalhadas
            .map((c) => `${c.codigo}${c.especificacao ? " - " + c.especificacao : ""}`)
            .join("; ")}`,
        );
      }
      if (it.urlProcesso) writeLine(`URL: ${it.urlProcesso}`, 9, [80, 80, 200]);

      // Evidência: trecho original do JSON do INPI para auditoria
      if (it.raw) {
        y += 2;
        writeLine("Evidência (JSON original do INPI):", 10, [60, 60, 60]);
        let jsonStr: string;
        try {
          jsonStr = JSON.stringify(it.raw, null, 2);
        } catch {
          jsonStr = String(it.raw);
        }
        if (jsonStr.length > 3500) jsonStr = jsonStr.slice(0, 3500) + "\n... [truncado]";
        doc.setFont("courier", "normal");
        doc.setFontSize(8);
        doc.setTextColor(40, 40, 40);
        const evLines = doc.splitTextToSize(jsonStr, maxW);
        for (const ln of evLines) {
          ensure(4);
          doc.text(ln, marginX, y);
          y += 3.5;
        }
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
      }
      y += 3;
    });

    // Rodapé com paginação
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      doc.setFontSize(9);
      doc.setTextColor(140);
      doc.text(`Página ${p} de ${total}`, pageW - marginX, pageH - 8, { align: "right" });
    }

    doc.save(`viabilidade-${resultado.marca.replace(/\s+/g, "-")}.pdf`);
  }

  function notificarJuridico() {
    toast.success("Time jurídico notificado para auditoria manual.");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Dashboard de Vendas • INPI Express
          </div>
        </div>

        <div className="mb-8 space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Consulta Rápida de Viabilidade
          </h1>
          <p className="text-muted-foreground text-lg">
            Feche mais contratos com decisões em segundos — direto do balcão de vendas.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-6">
            <Card className="border-primary/20 shadow-lg shadow-primary/5">
              <CardHeader>
                <CardTitle className="text-xl">Verificar Marca</CardTitle>
                <CardDescription>
                  Nome exato + classe de Nice (1–45) para máxima precisão.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-[3]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nome da marca (ex: Certifica Mais)"
                      value={marca}
                      onChange={(e) => setMarca(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="pl-10 h-12 text-base"
                    />
                  </div>
                  <Input
                    type="number"
                    min="1"
                    max="45"
                    placeholder="Classe"
                    value={classe}
                    onChange={(e) => setClasse(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="h-12 md:w-32 text-base"
                  />
                  <Button
                    onClick={handleSearch}
                    disabled={isLoading}
                    size="lg"
                    className="h-12 px-8 font-semibold"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      "Verificar Disponibilidade"
                    )}
                  </Button>
                </div>

                {/* Painel colapsável: Configurações do Motor de Busca */}
                <Collapsible open={showEngines} onOpenChange={setShowEngines} className="mt-4">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border bg-muted/30 hover:bg-muted/60 text-sm font-medium transition"
                    >
                      <span className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4 text-primary" />
                        Configurações do Motor de Busca
                        <Badge variant="secondary" className="ml-1 text-[10px]">
                          {Object.values(engines).filter(Boolean).length}/4 ativos
                        </Badge>
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${
                          showEngines ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <div className="grid sm:grid-cols-2 gap-3 p-3 rounded-md border bg-background">
                      <EngineToggle
                        label="Busca por Radical / Exata"
                        hint="Idêntica ou mesmo radical (ex: 'certifica' ⊇ 'certificare')."
                        checked={engines.radical}
                        onChange={(v) => setEngines((s) => ({ ...s, radical: v }))}
                        icon={<Search className="h-4 w-4" />}
                      />
                      <EngineToggle
                        label="Busca Avançada Booleana"
                        hint="Operadores AND, OR, NOT (uppercase) e &quot;frase exata&quot;."
                        checked={engines.booleana}
                        onChange={(v) => setEngines((s) => ({ ...s, booleana: v }))}
                        icon={<FileText className="h-4 w-4" />}
                      />
                      <EngineToggle
                        label="Aproximação Fuzzy (Fuse.js)"
                        hint="Tolera erros de digitação e variações de escrita."
                        checked={engines.fuzzy}
                        onChange={(v) => setEngines((s) => ({ ...s, fuzzy: v }))}
                        icon={<Sparkles className="h-4 w-4" />}
                      />
                      <EngineToggle
                        label="Varredura Fonética Avançada"
                        hint="Mesma pronúncia, grafia diferente (Kaza ≡ Casa)."
                        checked={engines.fonetica}
                        onChange={(v) => setEngines((s) => ({ ...s, fonetica: v }))}
                        icon={<Volume2 className="h-4 w-4" />}
                        critical
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Itens marcados como <strong>Validado</strong> aparecem em ≥2 motores ativos.
                </p>
              </CardContent>
            </Card>

            {resultado && !isLoading && <PrecisionSealCard engines={engines} />}

            {isLoading && <LoadingSkeleton />}

            {resultado && !isLoading && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                {resultado.fallback && <ContingencyBanner onNotify={notificarJuridico} />}
                <StatusCard result={resultado} onExport={exportPDF} />
                {resultado.status !== "green" && resultado.items.length > 0 && (
                  <>
                    <ConflictDiagnosisCard items={resultado.items} classe={resultado.classe} />
                    <CollisionPanel items={resultado.items} onSelect={setSelected} />
                  </>
                )}
              </div>
            )}

            {!resultado && !isLoading && <EmptyState />}
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Últimas buscas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {history.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    Nenhuma consulta ainda.
                  </p>
                )}
                {history.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setMarca(h.marca);
                      setClasse(h.classe);
                      setResultado(h);
                    }}
                    className="w-full text-left p-2.5 rounded-md border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{h.marca}</span>
                      <StatusDot status={h.status} />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {h.classe ? `Classe ${h.classe} • ` : ""}
                      {new Date(h.timestamp).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      <ProcessoDrawer processo={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function StatusDot({ status }: { status: Status }) {
  const color =
    status === "green"
      ? "bg-emerald-500"
      : status === "yellow"
        ? "bg-amber-500"
        : status === "red"
          ? "bg-red-500"
          : "bg-zinc-400";
  return <span className={`h-2 w-2 rounded-full ${color}`} />;
}

function situacaoBadge(tipo: ProcessoColidente["situacaoTipo"], label: string) {
  const map: Record<ProcessoColidente["situacaoTipo"], string> = {
    registrada: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    exame: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
    arquivada: "bg-muted text-muted-foreground border-border",
    oposicao: "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    indeferido: "bg-red-100 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
    pendente: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Badge variant="outline" className={`${map[tipo]} font-medium`}>
      {label}
    </Badge>
  );
}

function CollisionPanel({
  items,
  onSelect,
}: {
  items: ProcessoColidente[];
  onSelect: (p: ProcessoColidente) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Análise de Colidências
        </CardTitle>
        <CardDescription>
          {items.length} processo{items.length > 1 ? "s" : ""} similar
          {items.length > 1 ? "es" : ""} encontrado{items.length > 1 ? "s" : ""} no INPI. Clique
          para ver detalhes.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Processo</TableHead>
                <TableHead>Marca / Titular</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Despacho</TableHead>
                <TableHead>Depósito</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow
                  key={it.processo}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSelect(it)}
                >
                  <TableCell className="font-mono text-xs font-bold text-primary">
                    {it.processo}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{it.marca}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                      {it.titular}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">Cl. {it.classe}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {it.especificacao}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {situacaoBadge(it.situacaoTipo, it.situacao)}
                      <MatchesBadge item={it} />
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <UltimoDespachoCell despacho={it.ultimoDespacho} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{it.dataDeposito}</TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden p-4 space-y-3">
          {items.map((it) => (
            <button
              key={it.processo}
              onClick={() => onSelect(it)}
              className="w-full text-left p-4 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-colors space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-xs font-bold text-primary">{it.processo}</div>
                  <div className="font-semibold mt-1">{it.marca}</div>
                  <div className="text-xs text-muted-foreground">{it.titular}</div>
                </div>
                {situacaoBadge(it.situacaoTipo, it.situacao)}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>Classe {it.classe}</span>
                <span>{it.dataDeposito}</span>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProcessoDrawer({
  processo,
  onClose,
}: {
  processo: ProcessoColidente | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!processo} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {processo && (
          <>
            <SheetHeader className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-primary">
                  {processo.processo}
                </span>
                {situacaoBadge(processo.situacaoTipo, processo.situacao)}
                {processo.matchType && (
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    {processo.matchType}
                    {processo.score != null
                      ? ` · ${Math.round(processo.score * 100)}%`
                      : ""}
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-2xl">{processo.marca}</SheetTitle>
              <SheetDescription>
                Titular: <strong>{processo.titular}</strong>
                <br />
                Classe {processo.classe} — {processo.especificacao}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* SCRIPT DE VENDAS — tradutor comercial */}
              {processo.scriptVendas && (
                <SalesScriptBlock processo={processo} />
              )}

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Lightbulb className="h-4 w-4" />
                  Análise comercial (IA)
                </div>
                <p className="text-sm leading-relaxed">{processo.notaIA}</p>
              </div>

              {/* Ficha técnica detalhada do processo */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <h4 className="text-sm font-semibold mb-3">Ficha técnica INPI</h4>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <DetalheItem label="Apresentação" valor={processo.apresentacao} />
                  <DetalheItem label="Natureza" valor={processo.natureza} />
                  <DetalheItem label="Depósito" valor={processo.dataDeposito} />
                  <DetalheItem label="Publicação" valor={processo.dataPublicacao} />
                  <DetalheItem label="Vigência" valor={processo.vigencia} />
                  <DetalheItem label="Prioridade" valor={processo.prioridade} />
                  <DetalheItem label="Nº Registro" valor={processo.numeroRegistro} />
                  <DetalheItem label="Edição RPI" valor={processo.edicaoRPI} />
                  <DetalheItem label="Próxima publicação" valor={processo.proximaPublicacao} />
                  <DetalheItem label="Tradução" valor={processo.traducao} />
                  <DetalheItem label="Cor reivindicada" valor={processo.corReivindicada} />
                  <DetalheItem label="CNPJ/CPF Titular" valor={processo.cnpjTitular} />
                  <DetalheItem label="País" valor={processo.paisTitular} />
                  <DetalheItem label="UF" valor={processo.ufTitular} />
                  <DetalheItem label="Cidade" valor={processo.cidadeTitular} />
                  <DetalheItem label="Endereço Titular" valor={processo.enderecoTitular} colSpan />
                  <DetalheItem label="Procurador" valor={processo.procurador} colSpan />
                  {processo.cotitulares && processo.cotitulares.length > 0 && (
                    <DetalheItem
                      label="Cotitulares"
                      valor={processo.cotitulares.join(" • ")}
                      colSpan
                    />
                  )}
                  {processo.urlProcesso && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Processo no INPI</dt>
                      <dd>
                        <a
                          href={processo.urlProcesso}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline break-all"
                        >
                          {processo.urlProcesso}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>

                {processo.classesDetalhadas && processo.classesDetalhadas.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs font-semibold mb-2">Classes Nice</div>
                    <ul className="space-y-1 text-xs">
                      {processo.classesDetalhadas.map((c, i) => (
                        <li key={i}>
                          <span className="font-mono text-primary">NCL {c.codigo}</span>
                          {c.especificacao ? ` — ${c.especificacao}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {processo.prioridadesUnionistas && processo.prioridadesUnionistas.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs font-semibold mb-2">Prioridades unionistas</div>
                    <ul className="space-y-1 text-xs">
                      {processo.prioridadesUnionistas.map((p, i) => (
                        <li key={i}>
                          {[p.pais, p.numero, p.data].filter(Boolean).join(" • ") || "—"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {processo.urlImagem && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs font-semibold mb-2">Imagem da marca</div>
                    <img
                      src={processo.urlImagem}
                      alt={`Marca ${processo.marca}`}
                      className="max-h-32 rounded border bg-white p-2"
                    />
                  </div>
                )}
              </div>

              {processo.despachos && processo.despachos.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Histórico de Publicações e Petições
                  </h4>
                  <ol className="space-y-3 text-xs">
                    {processo.despachos.map((d, i) => (
                      <li
                        key={i}
                        className={`rounded-md border p-3 ${
                          d.tipo === "conflito"
                            ? "border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-900"
                            : "border-border bg-muted/30"
                        }`}
                      >
                        <div className="flex justify-between gap-3 items-start">
                          <div className="font-medium">
                            <span className="font-mono text-primary">Despacho {d.codigo}</span>{" "}
                            — {d.nome}
                          </div>
                          <span className="text-muted-foreground shrink-0">{d.data}</span>
                        </div>
                        {d.texto && (
                          <p className="mt-2 text-muted-foreground leading-relaxed">
                            <span className="font-semibold text-foreground">Justificativa INPI: </span>
                            {d.texto}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div>

                <h4 className="text-sm font-semibold mb-4">Linha do tempo no INPI</h4>
                <ol className="space-y-4 relative border-l-2 border-muted pl-6">
                  {processo.timeline.map((etapa, i) => (
                    <li key={i} className="relative">
                      <span
                        className={`absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          etapa.concluida
                            ? "bg-emerald-500 border-emerald-500"
                            : "bg-background border-muted-foreground/40"
                        }`}
                      >
                        {etapa.concluida ? (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        ) : (
                          <CircleDot className="h-3 w-3 text-muted-foreground" />
                        )}
                      </span>
                      <div
                        className={`font-medium text-sm ${
                          etapa.concluida ? "" : "text-muted-foreground"
                        }`}
                      >
                        {etapa.etapa}
                      </div>
                      <div className="text-xs text-muted-foreground">{etapa.data}</div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 items-center">
              <Skeleton className="h-10 w-24" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ContingencyBanner({ onNotify }: { onNotify: () => void }) {
  return (
    <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
      <CardContent className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <WifiOff className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
              ⚠️ Consulta INPI inconclusiva.
            </p>
            <p className="text-xs text-amber-800/80 dark:text-amber-200/70 mt-0.5">
              Não houve liberação da marca; refaça a consulta ou solicite auditoria manual.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onNotify} className="gap-2 shrink-0">
          <ShieldAlert className="h-3.5 w-3.5" />
          Notificar Jurídico
        </Button>
      </CardContent>
    </Card>
  );
}

function StatusCard({ result, onExport }: { result: ResultState; onExport: () => void }) {
  const configs = {
    green: {
      icon: CheckCircle2,
      title: "Sem colidência retornada",
      message:
        "A consulta foi concluída e o JSON oficial não retornou processos colidentes para os parâmetros enviados. Use como triagem técnica, mantendo revisão jurídica antes do protocolo.",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-300 dark:border-emerald-800",
      text: "text-emerald-900 dark:text-emerald-100",
      accent: "text-emerald-600 dark:text-emerald-400",
      badge: "bg-emerald-600 text-white",
      label: "🟢 DISPONÍVEL",
    },
    yellow: {
      icon: AlertTriangle,
      title: "Livre com Ressalvas",
      message:
        "O INPI retornou processos ou sinais que exigem revisão. Não trate como marca livre sem análise jurídica dos registros listados.",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-300 dark:border-amber-800",
      text: "text-amber-900 dark:text-amber-100",
      accent: "text-amber-600 dark:text-amber-400",
      badge: "bg-amber-500 text-white",
      label: "🟡 RISCO MÉDIO",
    },
    red: {
      icon: XCircle,
      title: "Marca Inviável",
      message:
        "🚨 Alerta de Conflito: Já existe empresa operando com este nome exato no mesmo segmento. Sugira uma variação ao cliente.",
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-300 dark:border-red-800",
      text: "text-red-900 dark:text-red-100",
      accent: "text-red-600 dark:text-red-400",
      badge: "bg-red-600 text-white",
      label: "🔴 INVIÁVEL",
    },
    error: {
      icon: XCircle,
      title: "Consulta não concluída",
      message:
        "Não foi possível validar a marca no INPI agora (timeout ou indisponibilidade). Este resultado NÃO é uma liberação — refaça a consulta em instantes ou acione o jurídico para auditoria manual.",
      bg: "bg-zinc-50 dark:bg-zinc-900/40",
      border: "border-zinc-300 dark:border-zinc-700",
      text: "text-zinc-900 dark:text-zinc-100",
      accent: "text-zinc-600 dark:text-zinc-400",
      badge: "bg-zinc-700 text-white",
      label: "⚠️ INCONCLUSIVO",
    },
  };
  const c = configs[result.status];
  const Icon = c.icon;

  return (
    <Card className={`${c.bg} ${c.border} border-2 shadow-xl overflow-hidden`}>
      <div className={`px-6 py-2 ${c.badge} text-xs font-bold tracking-wider`}>{c.label}</div>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${c.bg} ${c.border} border-2 shrink-0`}>
            <Icon className={`h-8 w-8 ${c.accent}`} />
          </div>
          <div className="flex-1 space-y-2">
            <h2 className={`text-2xl font-bold ${c.text}`}>{c.title}</h2>
            <p className={`${c.text} opacity-90 leading-relaxed`}>{c.message}</p>
            <div className={`flex flex-wrap gap-4 pt-3 text-sm ${c.text} opacity-80`}>
              <span>
                <strong>Marca:</strong> {result.marca}
              </span>
              {result.classe && (
                <span>
                  <strong>Classe:</strong> {result.classe}
                </span>
              )}
              <span>
                <strong>Registros:</strong> {result.total}
                {result.rawCount != null && result.rawCount !== result.total && (
                  <span className="opacity-70"> ({result.rawCount} brutos do INPI)</span>
                )}
              </span>
            </div>

            {/* Diagnóstico da fonte — auditoria jurídica */}
            <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px]">
              {result.source === "api" ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Fonte: INPI / Infosimples (ao vivo)
                </Badge>
              ) : (
                <Badge className="bg-amber-500 hover:bg-amber-500 text-white gap-1">
                  <WifiOff className="h-3 w-3" /> Consulta não validada
                </Badge>
              )}
              {result.apiCode !== undefined && (
                <span className={`${c.text} opacity-70`}>code={String(result.apiCode)}</span>
              )}
              {result.durationMs != null && (
                <span className={`${c.text} opacity-70`}>· {result.durationMs}ms</span>
              )}
              {result.errorMsg && (
                <span className="text-red-700 dark:text-red-300">· {result.errorMsg}</span>
              )}
            </div>

            {result.validation && (
              <div className="mt-3 rounded-md border bg-background/60 p-3 text-xs space-y-2">
                <div className="font-semibold">Validação do JSON recebido</div>
                {result.validation.evidence.length > 0 && (
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    {result.validation.evidence.map((line, i) => (
                      <li key={`ev-${i}`}>{line}</li>
                    ))}
                  </ul>
                )}
                {result.validation.warnings.length > 0 && (
                  <ul className="list-disc pl-4 space-y-1 text-amber-700 dark:text-amber-300">
                    {result.validation.warnings.map((line, i) => (
                      <li key={`warn-${i}`}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={onExport} variant="outline" className="gap-2">
            <FileDown className="h-4 w-4" />
            Exportar PDF Completo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-16 text-center space-y-3">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Search className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg">Pronto para consultar</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Digite o nome da marca e a classe acima para receber um diagnóstico comercial em segundos.
        </p>
      </CardContent>
    </Card>
  );
}

function DetalheItem({
  label,
  valor,
  colSpan,
}: {
  label: string;
  valor?: string;
  colSpan?: boolean;
}) {
  return (
    <div className={colSpan ? "col-span-2" : ""}>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium">{valor && valor !== "—" ? valor : "—"}</dd>
    </div>
  );
}

function MatchesBadge({ item }: { item: ProcessoColidente }) {
  const matches = item.matches ?? [];
  if (!matches.length) return null;
  const labels: Record<SearchMode, string> = {
    exato: "Exato",
    radical: "Radical",
    booleana: "Bool",
    fuzzy: "Fuzzy",
    fonetica: "Fonética",
  };
  const styles: Record<SearchMode, string> = {
    exato: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
    radical: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
    booleana: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900",
    fuzzy: "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    fonetica: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 dark:border-fuchsia-900",
  };
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {item.validado && (
        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[9px] px-1.5 py-0">
          ✓ Validado
        </Badge>
      )}
      {matches.map((m) => (
        <span
          key={m}
          className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${styles[m]}`}
          title={`Casou no motor ${m}`}
        >
          [{labels[m]}]
        </span>
      ))}
      {item.score != null && (
        <span className="text-[9px] text-muted-foreground">
          {Math.round(item.score * 100)}%
        </span>
      )}
    </div>
  );
}

// ============ DIAGNÓSTICO DE CONFLITO ============
function gravidadeMeta(g?: Gravidade) {
  switch (g) {
    case "critico":
      return {
        label: "Risco Crítico de Processo Judicial",
        cls: "bg-red-600 hover:bg-red-600 text-white",
        ring: "border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30",
        icon: Gavel,
      };
    case "moderado":
      return {
        label: "Risco Moderado / Disputável",
        cls: "bg-amber-500 hover:bg-amber-500 text-white",
        ring: "border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30",
        icon: AlertTriangle,
      };
    default:
      return {
        label: "Risco Baixo",
        cls: "bg-muted text-foreground",
        ring: "border-border bg-muted/30",
        icon: ShieldAlert,
      };
  }
}

function pickPior(items: ProcessoColidente[], classe: string): ProcessoColidente | null {
  const sameClasse = items.filter((i) => !classe || i.classe === classe);
  const pool = sameClasse.length ? sameClasse : items;
  const rank = (g?: Gravidade) => (g === "critico" ? 3 : g === "moderado" ? 2 : 1);
  return [...pool].sort((a, b) => rank(b.gravidade) - rank(a.gravidade))[0] ?? null;
}

function ConflictDiagnosisCard({
  items,
  classe,
}: {
  items: ProcessoColidente[];
  classe: string;
}) {
  const pior = pickPior(items, classe);
  if (!pior || !pior.motivoConflito) return null;
  const meta = gravidadeMeta(pior.gravidade);
  const Icon = meta.icon;

  return (
    <Card className={`border-2 ${meta.ring}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-lg flex items-center gap-2">
            <Icon className="h-5 w-5" />
            Diagnóstico do Conflito
          </CardTitle>
          <Badge className={meta.cls}>{meta.label}</Badge>
        </div>
        <CardDescription>
          Causa principal identificada na base do INPI para a marca consultada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
            Motivo principal
          </div>
          <div className="text-base font-semibold">{pior.motivoConflito}</div>
        </div>
        {pior.baseLegal && (
          <div className="rounded-md border bg-background/60 p-3 flex gap-3">
            <Scale className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <div className="font-semibold mb-0.5">Base legal</div>
              <p className="text-muted-foreground">{pior.baseLegal}</p>
            </div>
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          Referência: processo{" "}
          <span className="font-mono text-primary font-bold">{pior.processo}</span> —{" "}
          {pior.marca} · Titular: {pior.titular}
        </div>
      </CardContent>
    </Card>
  );
}

function UltimoDespachoCell({ despacho }: { despacho?: Despacho }) {
  if (!despacho) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const conflito = despacho.tipo === "conflito";
  return (
    <div className="flex flex-col gap-1">
      <Badge
        variant="outline"
        className={
          conflito
            ? "bg-red-100 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 gap-1 w-fit"
            : "bg-muted text-muted-foreground border-border gap-1 w-fit"
        }
      >
        {conflito && <AlertTriangle className="h-3 w-3" />}
        <span className="font-mono">{despacho.codigo}</span>
        <span className="truncate max-w-[140px]">{despacho.nome}</span>
      </Badge>
      <span className="text-[10px] text-muted-foreground">{despacho.data}</span>
    </div>
  );
}

function SalesScriptBlock({ processo }: { processo: ProcessoColidente }) {
  const critico = processo.gravidade === "critico";
  const wrap = critico
    ? "border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900"
    : "border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900";
  const accent = critico
    ? "text-red-700 dark:text-red-300"
    : "text-amber-800 dark:text-amber-300";
  return (
    <div className={`rounded-lg border-2 p-4 space-y-2 ${wrap}`}>
      <div className={`flex items-center gap-2 text-sm font-bold ${accent}`}>
        <Megaphone className="h-4 w-4" />
        Como explicar isso ao cliente (Script de Vendas)
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">{processo.scriptVendas}</p>
      {processo.motivoConflito && (
        <div className="text-[11px] text-muted-foreground pt-1 border-t border-current/10">
          Motivo: <strong>{processo.motivoConflito}</strong>
          {processo.baseLegal ? ` · ${processo.baseLegal}` : ""}
        </div>
      )}
    </div>
  );
}

function EngineToggle({
  label,
  hint,
  checked,
  onChange,
  icon,
  critical,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactNode;
  critical?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition ${
        checked
          ? critical
            ? "border-fuchsia-300 bg-fuchsia-50/60 dark:bg-fuchsia-950/20 dark:border-fuchsia-900"
            : "border-primary/40 bg-primary/5"
          : "border-border bg-muted/20 hover:bg-muted/40"
      }`}
    >
      <div className="mt-0.5 text-primary">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{label}</span>
          {critical && (
            <Badge variant="outline" className="text-[9px] uppercase border-fuchsia-400 text-fuchsia-700 dark:text-fuchsia-300">
              Crítico
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function PrecisionSealCard({ engines }: { engines: EngineSettings }) {
  const ativos = Object.entries(engines).filter(([, v]) => v).length;
  const full = ativos === 4;
  return (
    <div
      className={`flex items-center gap-3 rounded-md border px-4 py-2.5 text-xs ${
        full
          ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900"
          : "border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900"
      }`}
    >
      <Lock className={`h-4 w-4 ${full ? "text-emerald-600" : "text-amber-600"}`} />
      <div className="flex-1">
        <div className="font-semibold">
          {full
            ? "🔒 Varredura de Precisão INPI Concluída"
            : "🔓 Varredura Parcial — alguns motores desligados"}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {full
            ? "100% de confiabilidade nos parâmetros Exato, Booleano, Fuse e Fonético."
            : `${ativos}/4 motores ativos. Ative todos para máxima cobertura jurídica.`}
        </div>
      </div>
      <div className="hidden sm:flex gap-1">
        {(["radical", "booleana", "fuzzy", "fonetica"] as const).map((k) => (
          <span
            key={k}
            className={`text-[9px] px-1.5 py-0.5 rounded border ${
              engines[k]
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            {k === "radical" ? "Exato/Radical" : k === "booleana" ? "Bool" : k === "fuzzy" ? "Fuzzy" : "Fonético"}
          </span>
        ))}
      </div>
    </div>
  );
}
