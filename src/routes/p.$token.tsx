import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  CreditCard,
  Download,
  FileText,
  Info,
  Loader2,
  Plus,
  Receipt,
  Scale,
  ScrollText,
  ShoppingCart,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Truck,
  Upload,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  CFOP_OPTIONS,
  CSOSN_MEI_OPTIONS,
  CSOSN_OPTIONS,
  CST_CBS_IBS_OPTIONS,
  CST_ICMS_OPTIONS,
  CST_IPI_SAIDA_OPTIONS,
  CST_PIS_COFINS_OPTIONS,
  IPI_CENQ_OPTIONS,
  C_CLASS_TRIB_OPTIONS,
  IND_IE_DEST_OPTIONS,
  CREDITO_PRESUMIDO_LC214_OPTIONS,
} from "@/lib/fiscal-options";
import {
  getParameterizationByToken,
  updateParameterizationByToken,
  uploadCertificateByToken,
} from "@/lib/parameterizations.functions";
import { MdfeForm, type MdfeData } from "@/components/parametrizacao/mdfe-form";
import { NfseForm, type NfseData } from "@/components/parametrizacao/nfse-form";
import { CteForm, type CteData } from "@/components/parametrizacao/cte-form";
import { BoletoForm, type BoletoData } from "@/components/parametrizacao/boleto-form";
import { CnpjInput } from "@/components/parametrizacao/cnpj-input";
import { useCnpjLookup, formatCnaeFromApi } from "@/hooks/use-cnpj-lookup";
import { toast } from "sonner";

export const Route = createFileRoute("/p/$token")({
  ssr: false,
  component: PublicForm,
});

type ModuleKey = "nfe" | "nfce" | "mdfe" | "nfse" | "cte" | "boleto";
type Regime = "simples" | "mei" | "normal";

type EmpresaGlobal = {
  razao_social?: string;
  cnpj_cpf?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  atividade_principal?: string;
  cnae_principal?: string;
  certificado_arquivo?: { name: string; size: number; path?: string };
  certificado_senha?: string;
  contador_nome?: string;
  contador_telefone?: string;
  contador_email?: string;
};

// Regra fiscal: um bloco reutilizável (ICMS + IPI + PIS/COFINS) por operação
// (ex.: Venda Interna, Venda Interestadual, Devolução, Bonificação...).
type FiscalRule = {
  id: string;
  nome: string;
  // Indicador de Destinatário padrão
  ind_ie_dest?: string;
  // ICMS Contribuinte & Não Contribuinte
  csosn?: string;
  csosn_nao_contrib?: string;
  cst_icms_contrib?: string;
  cst_icms_nao_contrib?: string;
  origem_mercadoria?: string;
  mod_bc_icms?: string;
  valor_bc_icms?: string;
  aliquota_icms?: string;
  aliquota_icms_nao_contrib?: string;
  valor_icms?: string;
  reducao_bc_icms?: string;
  reducao_bc_icms_nao_contrib?: string;
  cfop_estadual?: string;
  cfop_interestadual?: string;
  cfop_nao_contrib_interestadual?: string;
  usa_mva?: boolean;
  mva?: string;
  // Substituição Tributária
  substituicao_tributaria?: boolean;
  valor_icms_st?: string;
  // DIFAL / Partilha ICMS Não Contribuinte (EC 87/2015)
  usa_difal?: boolean;
  aliquota_icms_interestadual?: string;
  aliquota_icms_interna_destino?: string;
  aliquota_fcp?: string;
  // IPI
  usa_ipi?: boolean;
  cst_ipi?: string;
  ipi_cenq?: string;
  aliquota_ipi?: string;
  // PIS / COFINS
  cst_pis?: string;
  vbc_pis?: string;
  aliquota_pis?: string;
  cst_cofins?: string;
  vbc_cofins?: string;
  aliquota_cofins?: string;
};

const RULE_FIELD_KEYS: (keyof FiscalRule)[] = [
  "ind_ie_dest",
  "csosn", "csosn_nao_contrib", "cst_icms_contrib", "cst_icms_nao_contrib", "origem_mercadoria",
  "mod_bc_icms", "valor_bc_icms", "aliquota_icms", "aliquota_icms_nao_contrib", "valor_icms",
  "reducao_bc_icms", "reducao_bc_icms_nao_contrib", "cfop_estadual", "cfop_interestadual", "cfop_nao_contrib_interestadual",
  "usa_mva", "mva",
  "substituicao_tributaria", "valor_icms_st",
  "usa_difal", "aliquota_icms_interestadual", "aliquota_icms_interna_destino", "aliquota_fcp",
  "usa_ipi", "cst_ipi", "ipi_cenq", "aliquota_ipi",
  "cst_pis", "vbc_pis", "aliquota_pis",
  "cst_cofins", "vbc_cofins", "aliquota_cofins",
];

function newRuleId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* noop */ }
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeEmptyRule(nome = "Nova Regra"): FiscalRule {
  return { id: newRuleId(), nome };
}

type NfeData = {
  // Numeração específica NF-e
  ultima_nfe?: string;
  serie_nfe?: string;
  // Regime
  regime?: Regime;
  // Reforma Tributária — CBS / IBS / LC 214/2025
  cst_cbs?: string;
  aliquota_cbs?: string;
  aliquota_ibs_uf?: string;
  aliquota_ibs_mun?: string;
  diferimento_ibs?: string;
  reducao_ibs?: string;
  c_class_trib?: string;
  credito_presumido_cbs_ibs?: string[];
  percentual_credito_presumido_cbs?: string;
  percentual_credito_presumido_ibs?: string;
  codigo_indicador_operacao_fornecimento?: string;
  // Regras fiscais (nova estrutura)
  nfe_rules?: FiscalRule[];
  // NFC-e e Token CSC
  nfce_csc_id?: string;
  nfce_csc_codigo?: string;
  nfce_csc_ambiente?: "producao" | "homologacao";
  nfce_ultima_nfe?: string;
  nfce_serie?: string;
  nfce_csosn?: string;
  nfce_cst?: string;
  nfce_cfop?: string;
  nfce_aliquota_icms?: string;
  nfce_substituicao_tributaria?: boolean;
  nfce_valor_icms_st?: string;
  nfce_msg_cupom?: string;
  // Reforma Tributária NFC-e
  nfce_cst_cbs_ibs?: string;
  nfce_c_class_trib?: string;
  nfce_aliquota_cbs?: string;
  nfce_aliquota_ibs_uf?: string;
  nfce_reducao_ibs?: string;
  nfce_diferimento_ibs?: string;
  // Final
  observacoes?: string;
  smart_file?: { name: string; size: number };
  // Legado (compat): campos antigos ficam aceitos no load para migrar para nfe_rules.
  csosn?: string;
  cst_icms_contrib?: string;
  cst_icms_nao_contrib?: string;
  origem_mercadoria?: string;
  mod_bc_icms?: string;
  valor_bc_icms?: string;
  aliquota_icms?: string;
  valor_icms?: string;
  reducao_bc_icms?: string;
  cfop_estadual?: string;
  cfop_interestadual?: string;
  usa_mva?: boolean;
  mva?: string;
  substituicao_tributaria?: boolean;
  valor_icms_st?: string;
  usa_ipi?: boolean;
  cst_ipi?: string;
  aliquota_ipi?: string;
  ipi_cenq?: string;
  cst_pis?: string;
  aliquota_pis?: string;
  vbc_pis?: string;
  cst_cofins?: string;
  aliquota_cofins?: string;
  vbc_cofins?: string;
  // Legado (compat): empresa/contador podem chegar daqui em payloads antigos
  razao_social?: string;
  cnpj_cpf?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  atividade_principal?: string;
  cnae_principal?: string;
  certificado_arquivo?: { name: string; size: number; path?: string };
  certificado_senha?: string;
  contador_nome?: string;
  contador_telefone?: string;
  contador_email?: string;
};

// Migra campos fiscais achatados para nfe_rules[0]. Garante ao menos 1 regra.
function ensureNfeRules(nfe: NfeData): NfeData {
  const existing = Array.isArray(nfe.nfe_rules) ? nfe.nfe_rules.filter(Boolean) : [];
  const legacy: Partial<FiscalRule> = {};
  let hasLegacy = false;
  for (const k of RULE_FIELD_KEYS) {
    const v = (nfe as any)[k];
    if (v !== undefined && v !== null && v !== "") {
      (legacy as any)[k] = v;
      hasLegacy = true;
    }
  }
  const cleaned: NfeData = { ...nfe };
  for (const k of RULE_FIELD_KEYS) delete (cleaned as any)[k];

  const rules = [...existing];
  if (hasLegacy) {
    rules.unshift({ id: newRuleId(), nome: "Regra Padrão", ...legacy });
  }
  if (rules.length === 0) rules.push(makeEmptyRule("Regra Padrão"));
  cleaned.nfe_rules = rules;
  return cleaned;
}

type StoredFormData = {
  modules_selected?: ModuleKey[];
  empresa_global?: EmpresaGlobal;
  modulos?: {
    nfe?: NfeData;
    mdfe?: MdfeData;
    nfse?: NfseData;
    cte?: CteData;
    boleto?: BoletoData;
  };
  // Legado
  nfe_data?: NfeData;
  mdfe_data?: MdfeData;
  nfse_data?: NfseData;
  cte_data?: CteData;
  boleto_data?: BoletoData;
  [k: string]: any;
};

const EMPRESA_KEYS: (keyof EmpresaGlobal)[] = [
  "razao_social",
  "cnpj_cpf",
  "inscricao_estadual",
  "inscricao_municipal",
  "atividade_principal",
  "cnae_principal",
  "certificado_arquivo",
  "certificado_senha",
  "contador_nome",
  "contador_telefone",
  "contador_email",
];

function pickEmpresa(src: Record<string, any> | undefined): EmpresaGlobal {
  if (!src) return {};
  const out: EmpresaGlobal = {};
  for (const k of EMPRESA_KEYS) {
    const v = src[k as string];
    if (v !== undefined && v !== "" && v !== null) (out as any)[k] = v;
  }
  return out;
}


const MODULES: {
  key: ModuleKey;
  title: string;
  subtitle: string;
  icon: typeof Receipt;
  disabled?: boolean;
}[] = [
  { key: "nfe", title: "NF-e", subtitle: "Nota Fiscal Eletrônica (Produtos)", icon: Receipt },
  { key: "nfce", title: "NFC-e", subtitle: "Nota Fiscal de Consumidor", icon: ShoppingCart },
  { key: "mdfe", title: "MDF-e", subtitle: "Manifesto de Documentos Fiscais", icon: Truck },
  { key: "nfse", title: "NFS-e", subtitle: "Nota Fiscal de Serviço", icon: FileText },
  { key: "cte", title: "CT-e", subtitle: "Conhecimento de Transporte", icon: ScrollText },
  { key: "boleto", title: "Boleto Bancário", subtitle: "Homologação e emissão de boletos", icon: CreditCard },
];

const SOON_MODULES: { key: string; title: string; subtitle: string; icon: typeof Receipt }[] = [];

const NFE_TABS = [
  { key: "cadastrais", label: "Numeração NF-e" },
  { key: "regime", label: "Regime" },
  { key: "reforma", label: "Reforma Tributária (CBS/IBS)" },
  { key: "regras", label: "Regras Fiscais" },
] as const;

// ============================ Componente Principal ============================

function PublicForm() {
  const { token } = Route.useParams();
  const getFn = useServerFn(getParameterizationByToken);
  const updateFn = useServerFn(updateParameterizationByToken);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [done, setDone] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const summaryRef = useRef<HTMLDivElement | null>(null);

  // Passo Zero / Global / Wizard
  const [modulesSelected, setModulesSelected] = useState<ModuleKey[]>([]);
  const [stage, setStage] = useState<"select" | "global" | "wizard">("select");
  const [activeModule, setActiveModule] = useState<"nfe" | "mdfe" | "nfse" | "cte" | "boleto">("nfe");

  // Cadastro Global da Empresa (compartilhado entre todos os módulos)
  const [empresa, setEmpresa] = useState<EmpresaGlobal>({});

  // Dados por módulo (somente específicos)
  const [nfeData, setNfeData] = useState<NfeData>({});
  const [mdfeData, setMdfeData] = useState<MdfeData>({});
  const [nfseData, setNfseData] = useState<NfseData>({});
  const [cteData, setCteData] = useState<CteData>({});
  const [boletoData, setBoletoData] = useState<BoletoData>({});

  // NF-e interno
  const [nfeTab, setNfeTab] = useState<string>("cadastrais");
  const [started, setStarted] = useState(true);
  const [smartSkipped, setSmartSkipped] = useState(true);
  const [aiBusy, setAiBusy] = useState(false);
  // Human-in-the-loop: rastreia campos sugeridos pelo Processador de Documentos.
  const [suggestedFields, setSuggestedFields] = useState<Record<string, string>>({});
  // Termo de Responsabilidade e Conformidade
  const [acceptChecked, setAcceptChecked] = useState(false);
  const [acceptName, setAcceptName] = useState("");
  const [acceptCpf, setAcceptCpf] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const row = await getFn({ data: { token } });
        setClientName(row.client_name);
        const fd = (row.form_data ?? {}) as StoredFormData;

        // Carrega novo formato
        let mods = (fd.modules_selected ?? []) as ModuleKey[];
        const modulos = fd.modulos ?? {};
        let nfe: NfeData = (modulos.nfe ?? fd.nfe_data ?? {}) as NfeData;
        let mdfe: MdfeData = (modulos.mdfe ?? fd.mdfe_data ?? {}) as MdfeData;
        let nfse: NfseData = (modulos.nfse ?? fd.nfse_data ?? {}) as NfseData;
        let cte: CteData = (modulos.cte ?? fd.cte_data ?? {}) as CteData;
        let boleto: BoletoData = (modulos.boleto ?? fd.boleto_data ?? {}) as BoletoData;

        // Cadastro global: prioriza empresa_global, senão extrai do primeiro módulo com dados (legado)
        let empresaGlobal: EmpresaGlobal = fd.empresa_global ?? {};
        if (Object.keys(empresaGlobal).length === 0) {
          empresaGlobal = {
            ...pickEmpresa(cte as any),
            ...pickEmpresa(nfse as any),
            ...pickEmpresa(mdfe as any),
            ...pickEmpresa(nfe as any),
          };
        }

        // Compatibilidade com formato antigo (chaves achatadas)
        if (mods.length === 0) {
          const legacyMdfe: MdfeData = {};
          const legacyNfe: NfeData = {};
          for (const [k, v] of Object.entries(fd)) {
            if (["modules_selected", "nfe_data", "mdfe_data", "nfse_data", "cte_data", "empresa_global", "modulos"].includes(k)) continue;
            if (k.startsWith("mdfe_")) (legacyMdfe as any)[k] = v;
            else (legacyNfe as any)[k] = v;
          }
          const rt = (row as any).form_type as "nfe" | "mdfe" | undefined;
          if (Object.keys(legacyMdfe).length || rt === "mdfe") mods.push("mdfe");
          if (Object.keys(legacyNfe).length || rt === "nfe" || !rt) mods.push("nfe");
          if (legacyNfe.nfce_cst || legacyNfe.nfce_cfop) mods.push("nfce");
          nfe = { ...legacyNfe, ...nfe };
          mdfe = { ...legacyMdfe, ...mdfe };
          if (Object.keys(empresaGlobal).length === 0) {
            empresaGlobal = { ...pickEmpresa(legacyNfe as any), ...pickEmpresa(legacyMdfe as any) };
          }
        }

        // Remove campos de empresa dos módulos (apenas estado local; persistência também sobe sem eles)
        const stripEmpresa = <T extends Record<string, any>>(o: T): T => {
          const out: any = { ...o };
          for (const k of EMPRESA_KEYS) delete out[k as string];
          return out as T;
        };
        nfe = ensureNfeRules(stripEmpresa(nfe));
        mdfe = stripEmpresa(mdfe);
        nfse = stripEmpresa(nfse);
        cte = stripEmpresa(cte);

        setModulesSelected(mods);
        setEmpresa(empresaGlobal);
        setNfeData(nfe);
        setMdfeData(mdfe);
        setNfseData(nfse);
        setCteData(cte);
        setBoletoData(boleto);

        if (mods.length > 0) {
          // Se já tem dados de empresa, pula para wizard direto; senão, pede cadastro global
          const hasEmpresa = Object.keys(empresaGlobal).some((k) => (empresaGlobal as any)[k]);
          setStage(hasEmpresa ? "wizard" : "global");
          setActiveModule(pickInitialModule(mods));
          if (Object.keys(nfe).length > 0) setStarted(true);
        }
        if (row.status === "concluido") {
          setDone(true);
          setSubmittedAt(row.updated_at ? new Date(row.updated_at) : new Date());
        }
      } catch (e: any) {
        setError(e?.message ?? "Link inválido");
      } finally {
        setLoading(false);
      }
    })();
  }, [getFn, token]);

  // ----------- Salvamento (debounced) -----------
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = useCallback(
    (next: { modules?: ModuleKey[]; empresa?: EmpresaGlobal; nfe?: NfeData; mdfe?: MdfeData; nfse?: NfseData; cte?: CteData; boleto?: BoletoData; status?: "pendente" | "em_andamento" | "concluido" }) => {
      if (debRef.current) clearTimeout(debRef.current);
      setSaving(true);
      debRef.current = setTimeout(async () => {
        try {
          const empresaGlobal = next.empresa ?? empresa;
          const form_data: StoredFormData = {
            modules_selected: next.modules ?? modulesSelected,
            empresa_global: empresaGlobal,
            modulos: {
              nfe: next.nfe ?? nfeData,
              mdfe: next.mdfe ?? mdfeData,
              nfse: next.nfse ?? nfseData,
              cte: next.cte ?? cteData,
              boleto: next.boleto ?? boletoData,
            },
            // Mantém chaves legadas espelhadas para compat com leitores antigos (admin/PDF)
            nfe_data: { ...(next.nfe ?? nfeData), ...empresaGlobal },
            mdfe_data: { ...(next.mdfe ?? mdfeData), ...empresaGlobal } as any,
            nfse_data: { ...(next.nfse ?? nfseData), ...empresaGlobal } as any,
            cte_data: { ...(next.cte ?? cteData), ...empresaGlobal } as any,
            boleto_data: next.boleto ?? boletoData,
          };
          await updateFn({
            data: { token, form_data: form_data as any, status: next.status ?? "em_andamento" },
          });
          setSavedAt(new Date());
        } catch (e: any) {
          const msg = String(e?.message ?? "");
          if (/expirado|finalizado/i.test(msg)) {
            setError(msg);
          }
        } finally {
          setSaving(false);
        }

      }, 600);
    },
    [token, updateFn, modulesSelected, empresa, nfeData, mdfeData, nfseData, cteData, boletoData],
  );

  function toggleModule(key: ModuleKey) {
    setModulesSelected((prev) => {
      const willRemove = prev.includes(key);
      if (willRemove && key === "boleto") {
        // Limpa dados residuais do módulo opcional ao desmarcar
        setBoletoData({});
      }
      return willRemove ? prev.filter((m) => m !== key) : [...prev, key];
    });
  }


  function pickInitialModule(mods: ModuleKey[]): "nfe" | "mdfe" | "nfse" | "cte" | "boleto" {
    if (mods.includes("nfe") || mods.includes("nfce")) return "nfe";
    if (mods.includes("mdfe")) return "mdfe";
    if (mods.includes("nfse")) return "nfse";
    if (mods.includes("cte")) return "cte";
    return "boleto";
  }

  function goToGlobal() {
    setStage("global");
    save({ modules: modulesSelected, status: "em_andamento" });
  }

  function startWizard() {
    setStage("wizard");
    setActiveModule(pickInitialModule(modulesSelected));
    save({ modules: modulesSelected, status: "em_andamento" });
  }

  function backToSelect() {
    setStage("select");
  }

  function backToGlobal() {
    setStage("global");
  }

  function updateEmpresa<K extends keyof EmpresaGlobal>(key: K, value: EmpresaGlobal[K]) {
    setEmpresa((prev) => {
      const next = { ...prev, [key]: value };
      save({ empresa: next });
      return next;
    });
  }

  // Wrappers que aceitam tanto chaves específicas do módulo quanto chaves de empresa.
  // Se a chave for de empresa, redireciona para o estado global (sync automático).
  function makeUpdater<T extends Record<string, any>>(
    setter: React.Dispatch<React.SetStateAction<T>>,
    saveKey: "nfe" | "mdfe" | "nfse" | "cte" | "boleto",
  ) {
    return function update<K extends keyof T>(key: K, value: T[K]) {
      if ((EMPRESA_KEYS as string[]).includes(key as string)) {
        updateEmpresa(key as any, value as any);
        return;
      }
      setter((prev) => {
        const next = { ...prev, [key]: value };
        save({ [saveKey]: next } as any);
        return next;
      });
    };
  }

  const updateNfe = makeUpdater<NfeData>(setNfeData, "nfe");
  const updateNfse = makeUpdater<NfseData>(setNfseData, "nfse");
  const updateBoleto = makeUpdater<BoletoData>(setBoletoData, "boleto");

  function updateCte<K extends keyof CteData>(key: K, value: CteData[K]) {
    if ((EMPRESA_KEYS as string[]).includes(key as string)) {
      updateEmpresa(key as any, value as any);
      return;
    }
    setCteData((prev) => {
      const next = { ...prev, [key]: value };
      // Sincroniza campos de veículo compartilhados com MDF-e para evitar retrabalho e perda de dados
      setMdfeData((prevM) => {
        const nextM = { ...prevM };
        if (key === "placa") nextM.mdfe_placa = (value as string) ?? nextM.mdfe_placa;
        if (key === "renavam") nextM.mdfe_renavam = (value as string) ?? nextM.mdfe_renavam;
        if (key === "rntrc") nextM.mdfe_rntrc = (value as string) ?? nextM.mdfe_rntrc;
        if (key === "uf_placa") nextM.mdfe_uf_placa = (value as string) ?? nextM.mdfe_uf_placa;
        if (key === "tipo_rodado") nextM.mdfe_tipo_rodado = (value as string) ?? nextM.mdfe_tipo_rodado;
        if (key === "tipo_carroceria") nextM.mdfe_tipo_carroceria = (value as string) ?? nextM.mdfe_tipo_carroceria;
        if (key === "tipo_veiculo") nextM.mdfe_tipo_veiculo = (value as string) ?? nextM.mdfe_tipo_veiculo;
        if (key === "tipo_propriedade") {
          nextM.mdfe_tipo_propriedade = value === "terceiros" ? "terceiro" : (value as any);
        }
        if (key === "proprietario_endereco") nextM.mdfe_proprietario_endereco = (value as string) ?? nextM.mdfe_proprietario_endereco;
        save({ cte: next, mdfe: nextM });
        return nextM;
      });
      return next;
    });
  }

  function updateMdfe<K extends keyof MdfeData>(key: K, value: MdfeData[K]) {
    if ((EMPRESA_KEYS as string[]).includes(key as string)) {
      updateEmpresa(key as any, value as any);
      return;
    }
    setMdfeData((prev) => {
      const next = { ...prev, [key]: value };
      // Sincroniza campos de veículo compartilhados com CT-e para evitar retrabalho e perda de dados
      setCteData((prevC) => {
        const nextC = { ...prevC };
        if (key === "mdfe_placa") nextC.placa = (value as string) ?? nextC.placa;
        if (key === "mdfe_renavam") nextC.renavam = (value as string) ?? nextC.renavam;
        if (key === "mdfe_rntrc") nextC.rntrc = (value as string) ?? nextC.rntrc;
        if (key === "mdfe_uf_placa") nextC.uf_placa = (value as string) ?? nextC.uf_placa;
        if (key === "mdfe_tipo_rodado") nextC.tipo_rodado = (value as string) ?? nextC.tipo_rodado;
        if (key === "mdfe_tipo_carroceria") nextC.tipo_carroceria = (value as string) ?? nextC.tipo_carroceria;
        if (key === "mdfe_tipo_veiculo") nextC.tipo_veiculo = (value as any) ?? nextC.tipo_veiculo;
        if (key === "mdfe_tipo_propriedade") {
          nextC.tipo_propriedade = value === "terceiro" ? "terceiros" : (value as any);
        }
        if (key === "mdfe_proprietario_endereco") nextC.proprietario_endereco = (value as string) ?? nextC.proprietario_endereco;
        save({ mdfe: next, cte: nextC });
        return nextC;
      });
      return next;
    });
  }

  async function finish() {
    if (!acceptChecked || !isValidFullName(acceptName) || !isValidCpf(acceptCpf)) {
      toast.error("Preencha o Termo de Responsabilidade: aceite, nome completo (nome e sobrenome) e CPF válido.");
      return;
    }
    // Captura IP público para auditoria (silencioso em caso de falha).
    let ip: string | undefined;
    try {
      const r = await fetch("https://api.ipify.org?format=json");
      if (r.ok) ip = (await r.json())?.ip;
    } catch { /* noop */ }
    const signature_metadata = {
      signer_name: acceptName.trim(),
      signer_cpf: acceptCpf.trim(),
      accepted: true,
      signed_at: new Date().toISOString(),
      ip,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };
    // Cancela qualquer salvamento pendente: após a assinatura o formulário é travado.
    if (debRef.current) clearTimeout(debRef.current);
    try {
      await updateFn({
        data: {
          token,
          form_data: {
            modules_selected: modulesSelected,
            empresa_global: empresa,
            modulos: {
              nfe: nfeData,
              mdfe: mdfeData,
              nfse: nfseData,
              cte: cteData,
              boleto: boletoData,
            },
            signature_metadata,
            // Retrocompatibilidade
            compliance: signature_metadata,
            // Espelho legado
            nfe_data: { ...nfeData, ...empresa },
            mdfe_data: { ...mdfeData, ...empresa },
            nfse_data: { ...nfseData, ...empresa },
            cte_data: { ...cteData, ...empresa },
            boleto_data: boletoData,
          } as any,
          status: "concluido",
        },
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível finalizar. Tente novamente.");
      return;
    }
    setDone(true);
    setSubmittedAt(new Date());
  }



  async function downloadPdf() {
    if (!summaryRef.current) return;
    setDownloadingPdf(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(summaryRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imgHeight - heightLeft);
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }
      const safeName = (clientName || "Cliente").replace(/[^\w\d-]+/g, "_");
      pdf.save(`Comprovante_Parametrizacao_${safeName}.pdf`);
    } catch (err) {
      console.error("[downloadPdf] failed:", err);
      toast.error("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleSmartFile(f: File) {
    updateNfe("smart_file", { name: f.name, size: f.size });
    setAiBusy(true);
    const isXml = /\.xml$/i.test(f.name) || f.type.includes("xml");
    if (isXml) {
      const loadingToast = toast.loading("Lendo XML...");
      try {
        const { parseNfeXml } = await import("@/lib/nfe-xml-parser");
        const extract = await parseNfeXml(f);
        if (!extract) {
          toast.dismiss(loadingToast);
          toast.error("XML não reconhecido como NF-e. Continuando manualmente.");
        } else {
          // NÃO injetamos valores nos inputs. Apenas registramos os dados
          // extraídos como sugestões (botões "Inserir" ao lado de cada campo).
          const nextSuggested: Record<string, string> = { ...suggestedFields };
          for (const [k, v] of Object.entries(extract.empresa)) {
            if (v !== undefined) nextSuggested[`empresa.${k}`] = String(v);
          }
          for (const [k, v] of Object.entries(extract.nfe)) {
            if (v === undefined) continue;
            if ((RULE_FIELD_KEYS as string[]).includes(k)) {
              nextSuggested[`rule.${k}`] = String(v);
            } else {
              nextSuggested[`nfe.${k}`] = String(v);
            }
          }
          setSuggestedFields(nextSuggested);
          toast.dismiss(loadingToast);
          toast.success("Documento processado. Use os botões 'Inserir' ao lado de cada campo após conferência.");
        }
      } catch (err) {
        console.error("[xml-parse] failed:", err);
        toast.dismiss(loadingToast);
        toast.error("Não foi possível ler o XML. Continuando manualmente.");
      }
      setAiBusy(false);
      setStarted(true);
      return;
    }
    setTimeout(() => {
      setAiBusy(false);
      setStarted(true);
    }, 1400);
  }

  // ----------- Renders -----------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/20">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold mb-2">Link inválido</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }
  if (done) {
    const showNfce = modulesSelected.includes("nfce");
    const showNfe = modulesSelected.includes("nfe") || showNfce;
    const moduleLabels: Record<ModuleKey, string> = {
      nfe: "NF-e",
      nfce: "NFC-e",
      mdfe: "MDF-e",
      nfse: "NFS-e",
      cte: "CT-e",
      boleto: "Boleto Bancário",
    };
    return (
      <div className="min-h-screen bg-muted/20 py-8 px-4 print:bg-white print:py-0">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-card border rounded-2xl p-6 md:p-8 text-center shadow-sm print:hidden">
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Parametrização enviada com sucesso!</h1>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Obrigado por configurar o sistema do seu cliente. Nossa equipe Certifica+ assume daqui. 🎉
            </p>
            <div className="mt-5">
              <Button onClick={downloadPdf} disabled={downloadingPdf} className="gap-2">
                {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Baixar Comprovante (PDF)
              </Button>
            </div>
          </div>

          <div ref={summaryRef} className="bg-card border rounded-2xl p-6 md:p-8 shadow-sm space-y-5">
            <div className="border-b pb-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
                Comprovante · Certifica+ Parametrização Fiscal
              </p>
              <h2 className="text-xl md:text-2xl font-bold mt-1">{clientName || "Cliente"}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Enviado em {(submittedAt ?? new Date()).toLocaleString("pt-BR")}
              </p>
              {modulesSelected.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {modulesSelected.map((m) => (
                    <span key={m} className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-muted">
                      {moduleLabels[m]}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <EmpresaGlobalSummary empresa={empresa} />
            {showNfe && <ReviewSummary form={nfeData} empresa={empresa} showNfce={showNfce} hideEmpresa />}
            {modulesSelected.includes("mdfe") && <ModuleKeyValues title="MDF-e" data={mdfeData} />}
            {modulesSelected.includes("nfse") && <ModuleKeyValues title="NFS-e" data={nfseData} />}
            {modulesSelected.includes("cte") && <ModuleKeyValues title="CT-e" data={cteData} />}
            {(nfeData.observacoes || (mdfeData as any)?.observacoes || (nfseData as any)?.observacoes || (cteData as any)?.observacoes) && (
              <div className="border rounded-xl p-4 md:p-5 bg-muted/20">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Considerações Finais
                </h3>
                <div className="space-y-2 text-sm">
                  {nfeData.observacoes && <p><span className="text-muted-foreground text-xs uppercase tracking-wider">NF-e:</span> {nfeData.observacoes}</p>}
                  {(mdfeData as any)?.observacoes && <p><span className="text-muted-foreground text-xs uppercase tracking-wider">MDF-e:</span> {(mdfeData as any).observacoes}</p>}
                  {(nfseData as any)?.observacoes && <p><span className="text-muted-foreground text-xs uppercase tracking-wider">NFS-e:</span> {(nfseData as any).observacoes}</p>}
                  {(cteData as any)?.observacoes && <p><span className="text-muted-foreground text-xs uppercase tracking-wider">CT-e:</span> {(cteData as any).observacoes}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Passo Zero — Seleção de Módulos
  if (stage === "select") {
    return (
      <div className="min-h-screen bg-muted/20">
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
          <header className="mb-8">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
              Certifica+ · Parametrização Fiscal
            </p>
            <h1 className="text-lg md:text-xl font-bold leading-tight">{clientName}</h1>
          </header>

          <div className="bg-card border rounded-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-xl md:text-2xl font-bold mb-1">
              Quais documentos fiscais este cliente emite?
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Selecione um ou mais módulos. O formulário se adapta à sua escolha.
            </p>

            <div className="grid gap-3 md:grid-cols-3">
              {MODULES.map((m) => {
                const Icon = m.icon;
                const checked = modulesSelected.includes(m.key);
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => toggleModule(m.key)}
                    className={cn(
                      "text-left rounded-xl border-2 p-4 transition-all hover:border-primary/40 relative",
                      checked ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card",
                    )}
                  >
                    {checked && (
                      <span className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <Icon className={cn("h-6 w-6 mb-2", checked ? "text-primary" : "text-muted-foreground")} />
                    <div className="font-semibold">{m.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{m.subtitle}</div>
                  </button>
                );
              })}
              {SOON_MODULES.map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.key}
                    className="text-left rounded-xl border-2 border-dashed border-border bg-muted/30 p-4 opacity-60 cursor-not-allowed relative"
                  >
                    <span className="absolute top-3 right-3 text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-background px-2 py-0.5 rounded-full border">
                      Em breve
                    </span>
                    <Icon className="h-6 w-6 mb-2 text-muted-foreground" />
                    <div className="font-semibold">{m.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{m.subtitle}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex justify-end">
              <Button
                size="lg"
                disabled={modulesSelected.length === 0}
                onClick={goToGlobal}
                className="gap-2"
              >
                Próximo: Cadastro da Empresa →
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Passo Um — Cadastro Global da Empresa (compartilhado entre todos os módulos)
  if (stage === "global") {
    const empresaPronta = !!(empresa.razao_social && empresa.cnpj_cpf);
    return (
      <div className="min-h-screen bg-muted/20">
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 pb-28 md:pb-10">

          <header className="mb-6 flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                Certifica+ · Cadastro da Empresa
              </p>
              <h1 className="text-lg md:text-xl font-bold leading-tight">{clientName}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Preenchido uma única vez — esses dados serão reutilizados em todos os módulos selecionados.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={backToSelect} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </Button>
          </header>
          <EmpresaGlobalForm empresa={empresa} update={updateEmpresa} />
          <div className="mt-6 flex justify-end">
            <Button size="lg" disabled={!empresaPronta} onClick={startWizard} className="gap-2">
              Continuar para os módulos →
            </Button>
          </div>
        </div>
      </div>
    );
  }


  // Wizard com super-abas dinâmicas
  const showNfe = modulesSelected.includes("nfe") || modulesSelected.includes("nfce");
  const showMdfe = modulesSelected.includes("mdfe");
  const showNfce = modulesSelected.includes("nfce");
  const showNfse = modulesSelected.includes("nfse");
  const showCte = modulesSelected.includes("cte");
  const showBoleto = modulesSelected.includes("boleto");
  const superTabs: { key: "nfe" | "mdfe" | "nfse" | "cte" | "boleto"; label: string }[] = [];
  if (showNfe) superTabs.push({ key: "nfe", label: showNfce ? "NF-e / NFC-e" : "NF-e" });
  if (showMdfe) superTabs.push({ key: "mdfe", label: "MDF-e" });
  if (showNfse) superTabs.push({ key: "nfse", label: "NFS-e" });
  if (showCte) superTabs.push({ key: "cte", label: "CT-e" });
  if (showBoleto) superTabs.push({ key: "boleto", label: "Boleto" });

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
        <header className="mb-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
              Certifica Conformidade Fiscal
            </p>
            <h1 className="text-lg md:text-xl font-bold leading-tight">{clientName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              {saving ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Salvando...</>
              ) : savedAt ? (
                <><Check className="h-3 w-3 text-emerald-600" /> Salvo {savedAt.toLocaleTimeString("pt-BR")}</>
              ) : null}
            </div>
            <Button variant="outline" size="sm" onClick={backToGlobal} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Editar empresa
            </Button>
          </div>
        </header>

        {superTabs.length > 1 && (
          <div className="flex gap-2 mb-4 bg-card border rounded-xl p-1.5 shadow-sm">
            {superTabs.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setActiveModule(s.key)}
                className={cn(
                  "flex-1 text-sm font-semibold py-2.5 rounded-lg transition-all",
                  activeModule === s.key
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                Parametrização {s.label}
              </button>
            ))}
          </div>
        )}

        {activeModule === "nfe" && showNfe && (
          <>
            {!started && (
              <SmartStart
                file={nfeData.smart_file}
                busy={aiBusy}
                onFile={handleSmartFile}
                onManual={() => setStarted(true)}
              />
            )}
            {started && (() => {
              const ruleHints: Record<string, string> = {};
              const nfeHints: Record<string, string> = {};
              const empresaHints: Record<string, string> = {};
              for (const [k, v] of Object.entries(suggestedFields)) {
                if (k.startsWith("rule.")) ruleHints[k.slice(5)] = v;
                else if (k.startsWith("nfe.")) nfeHints[k.slice(4)] = v;
                else if (k.startsWith("empresa.")) empresaHints[k.slice(8)] = v;
              }
              const hasExtract = Object.keys(suggestedFields).length > 0;
              return (
                <div className={cn("grid gap-4", hasExtract && "lg:grid-cols-[1fr_320px]")}>
                  <div className="bg-card border rounded-2xl p-4 md:p-6 shadow-sm">
                    {hasExtract && (
                      <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm flex items-start gap-2">
                        <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                        <span>
                          <strong>Documento fiscal processado.</strong> Utilize os botões de inserção rápida ao lado
                          de cada campo para preencher os dados sugeridos pelo documento{" "}
                          <strong>após sua conferência técnica</strong>.
                        </span>
                      </div>
                    )}
                    <Tabs value={nfeTab} onValueChange={setNfeTab} className="w-full min-w-0">
                  <TabsList className="flex flex-wrap md:flex-nowrap overflow-x-auto gap-1.5 bg-muted/80 p-1.5 rounded-xl w-full justify-start items-center max-w-full">
                    {NFE_TABS.map((t, i) => (
                      <TabsTrigger
                        key={t.key}
                        value={t.key}
                        className="px-3.5 py-2 text-xs md:text-sm font-medium rounded-lg shrink-0 whitespace-nowrap transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:font-semibold"
                      >
                        <span className="font-mono mr-1.5 opacity-60">{i + 1}</span>
                        {t.label}
                      </TabsTrigger>
                    ))}
                    {showNfce && (
                      <TabsTrigger
                        value="nfce"
                        className="px-3.5 py-2 text-xs md:text-sm font-medium rounded-lg shrink-0 whitespace-nowrap transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:font-semibold"
                      >
                        <span className="font-mono mr-1.5 opacity-60">{NFE_TABS.length + 1}</span>
                        NFC-e
                      </TabsTrigger>
                    )}
                    <TabsTrigger
                      value="final"
                      className="px-3.5 py-2 text-xs md:text-sm font-medium rounded-lg shrink-0 whitespace-nowrap transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:font-semibold"
                    >
                      <span className="font-mono mr-1.5 opacity-60">{NFE_TABS.length + (showNfce ? 2 : 1)}</span>
                      Final
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="cadastrais" className="pt-5">
                    <CadastraisTab form={nfeData} update={updateNfe} xmlHints={nfeHints} />
                  </TabsContent>
                  <TabsContent value="regime" className="pt-5">
                    <RegimeTab form={nfeData} update={updateNfe} />
                  </TabsContent>
                  <TabsContent value="reforma" className="pt-5">
                    <ReformaTributariaNfeTab form={nfeData} update={updateNfe} />
                  </TabsContent>
                  <TabsContent value="regras" className="pt-5">
                    <RegrasFiscaisTab form={nfeData} update={updateNfe} xmlHints={ruleHints} />
                  </TabsContent>


                  {showNfce && (
                    <TabsContent value="nfce" className="pt-5">
                      <NfceBlock form={nfeData} update={updateNfe} />
                    </TabsContent>
                  )}
                  <TabsContent value="final" className="pt-5 space-y-6">
                    <ReviewSummary form={nfeData} empresa={empresa} showNfce={showNfce} />
                    <Section title="Considerações Finais">
                      <Textarea
                        value={nfeData.observacoes ?? ""}
                        onChange={(e) => updateNfe("observacoes", e.target.value)}
                        rows={8}
                        placeholder="Particularidades do cliente, exceções fiscais, prazos, observações para a equipe fiscal..."
                      />
                    </Section>
                    <ComplianceTerm
                      checked={acceptChecked}
                      onChecked={setAcceptChecked}
                      name={acceptName}
                      onName={setAcceptName}
                      cpf={acceptCpf}
                      onCpf={setAcceptCpf}
                    />
                  </TabsContent>

                    </Tabs>
                  </div>
                  {hasExtract && (
                    <aside className="lg:sticky lg:top-4 lg:self-start order-first lg:order-none">
                      <ExtractionCard empresa={empresaHints} nfe={nfeHints} rule={ruleHints} />
                    </aside>
                  )}
                </div>
              );
            })()}
          </>
        )}

        {activeModule === "mdfe" && showMdfe && (
          <div className="space-y-6">
            <MdfeForm form={mdfeData} update={updateMdfe} onFinish={finish} hideEmpresa showFinishButton={false} />
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <ComplianceTerm
                checked={acceptChecked}
                onChecked={setAcceptChecked}
                name={acceptName}
                onName={setAcceptName}
                cpf={acceptCpf}
                onCpf={setAcceptCpf}
              />
            </div>
          </div>
        )}

        {activeModule === "nfse" && showNfse && (
          <div className="space-y-6">
            <NfseForm form={nfseData} update={updateNfse} onFinish={finish} hideEmpresa hideFinishButton />
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <ComplianceTerm
                checked={acceptChecked}
                onChecked={setAcceptChecked}
                name={acceptName}
                onName={setAcceptName}
                cpf={acceptCpf}
                onCpf={setAcceptCpf}
              />
            </div>
          </div>
        )}

        {activeModule === "cte" && showCte && (
          <div className="space-y-6">
            <CteForm form={cteData} update={updateCte} onFinish={finish} hideEmpresa showFinishButton={false} />
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <ComplianceTerm
                checked={acceptChecked}
                onChecked={setAcceptChecked}
                name={acceptName}
                onName={setAcceptName}
                cpf={acceptCpf}
                onCpf={setAcceptCpf}
              />
            </div>
          </div>
        )}

        {activeModule === "boleto" && showBoleto && (
          <div className="space-y-6">
            <BoletoForm form={boletoData} update={updateBoleto} onFinish={finish} hideFinishButton />
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <ComplianceTerm
                checked={acceptChecked}
                onChecked={setAcceptChecked}
                name={acceptName}
                onName={setAcceptName}
                cpf={acceptCpf}
                onCpf={setAcceptCpf}
              />
            </div>
          </div>
        )}

        {showNfe && (showMdfe || showNfse || showCte || showBoleto) && activeModule === "nfe" && (
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setActiveModule(showMdfe ? "mdfe" : showNfse ? "nfse" : showCte ? "cte" : "boleto")}
              className="gap-2"
            >
              Próximo módulo: {showMdfe ? "MDF-e" : showNfse ? "NFS-e" : showCte ? "CT-e" : "Boleto"} →
            </Button>
          </div>
        )}

        {activeModule === "mdfe" && showMdfe && (showNfse || showCte || showBoleto) && (
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setActiveModule(showNfse ? "nfse" : showCte ? "cte" : "boleto")} className="gap-2">
              Próximo módulo: {showNfse ? "NFS-e" : showCte ? "CT-e" : "Boleto"} →
            </Button>
          </div>
        )}

        {activeModule === "nfse" && showNfse && (showCte || showBoleto) && (
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setActiveModule(showCte ? "cte" : "boleto")} className="gap-2">
              Próximo módulo: {showCte ? "CT-e" : "Boleto"} →
            </Button>
          </div>
        )}

        {activeModule === "cte" && showCte && showBoleto && (
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setActiveModule("boleto")} className="gap-2">
              Próximo módulo: Boleto →
            </Button>
          </div>
        )}

        {/* Espaço reservado para o rodapé fixo do Termo de Responsabilidade */}
        <div aria-hidden className="h-[120px] md:h-[100px]" />
      </div>

      {/* Rodapé fixo: Ação final */}
      <FinalActionFooter
        canFinish={
          Boolean(
            acceptChecked && 
            isValidFullName(acceptName) && 
            isValidCpf(acceptCpf) && 
            empresa.contador_telefone && 
            empresa.contador_telefone.replace(/\D/g, "").length >= 10 && 
            !saving
          )
        }
        onFinish={finish}
        saving={saving}
      />
    </div>
  );
}

/* ----------------------------- Smart Start ---------------------------- */

function SmartStart({
  file,
  busy,
  onFile,
  onManual,
}: {
  file?: { name: string; size: number };
  busy: boolean;
  onFile: (f: File) => void;
  onManual: () => void;
}) {
  const [drag, setDrag] = useState(false);
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Certifica Conformidade Fiscal</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold mb-3">Processamento de Documentos Fiscais</h2>

        <label
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors",
            drag ? "border-primary bg-primary/5" : "border-border bg-background/60 hover:bg-muted/40",
          )}
        >
          {busy ? (
            <>
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm font-medium">Analisando arquivo...</p>
            </>
          ) : (
            <>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-semibold">
                {file ? file.name : "Arraste o documento aqui ou clique para selecionar"}
              </p>
              <p className="text-xs text-muted-foreground">XML · PDF · XLSX — até 10MB</p>
            </>
          )}
          <input
            type="file"
            accept=".xml,.pdf,.xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
          />
        </label>

        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-300 px-4 py-3 text-xs md:text-sm text-amber-900 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            <strong>Aviso de Responsabilidade:</strong> A extração de dados é um recurso de auxílio. A conferência e validação
            das informações parametrizadas são de responsabilidade exclusiva do contador.
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onManual}
        className="w-full text-sm text-muted-foreground hover:text-foreground py-3 underline-offset-4 hover:underline"
      >
        Não tenho arquivo, quero preencher manualmente →
      </button>
    </div>
  );
}

/* ---------------------- Card de Extração do XML ---------------------- */

const EXTRACT_EMPRESA_LABELS: Record<string, string> = {
  razao_social: "Razão Social",
  cnpj_cpf: "CNPJ / CPF",
  inscricao_estadual: "Inscrição Estadual",
  inscricao_municipal: "Inscrição Municipal",
  cnae_principal: "CNAE Principal",
};
const EXTRACT_NFE_LABELS: Record<string, string> = {
  serie_nfe: "Série NF-e",
  ultima_nfe: "Última NF-e",
  regime: "Regime tributário",
};
const EXTRACT_RULE_LABELS: Record<string, string> = {
  origem_mercadoria: "Origem da mercadoria",
  csosn: "CSOSN",
  cst_icms_contrib: "CST ICMS (Contrib.)",
  aliquota_icms: "Alíquota ICMS (%)",
  valor_bc_icms: "BC ICMS",
  valor_icms: "Valor ICMS",
  cfop_estadual: "CFOP Estadual",
  cfop_interestadual: "CFOP Interestadual",
  substituicao_tributaria: "ICMS-ST",
  valor_icms_st: "Valor ICMS-ST",
  cst_ipi: "CST IPI",
  aliquota_ipi: "Alíquota IPI (%)",
  ipi_cenq: "cEnq IPI",
  cst_pis: "CST PIS",
  aliquota_pis: "Alíquota PIS (%)",
  cst_cofins: "CST COFINS",
  aliquota_cofins: "Alíquota COFINS (%)",
};

function ExtractionCard({
  empresa,
  nfe,
  rule,
}: {
  empresa: Record<string, string>;
  nfe: Record<string, string>;
  rule: Record<string, string>;
}) {
  function Group({ title, data, labels }: { title: string; data: Record<string, string>; labels: Record<string, string> }) {
    const entries = Object.entries(data).filter(([k]) => labels[k]);
    if (entries.length === 0) return null;
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
        <dl className="space-y-1">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-2 text-xs">
              <dt className="text-muted-foreground shrink-0">{labels[k]}</dt>
              <dd className="font-mono font-semibold text-right break-all">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/60 p-4 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-700" />
        <h3 className="text-sm font-bold text-amber-900">Dados brutos lidos do XML</h3>
      </div>
      <p className="text-[11px] text-amber-900/80 leading-relaxed">
        Estes valores foram <strong>apenas extraídos</strong> — nenhum campo do formulário foi preenchido
        automaticamente. Use o botão <em>Inserir</em> ao lado de cada campo para copiar após conferência.
      </p>
      <div className="space-y-4">
        <Group title="Empresa" data={empresa} labels={EXTRACT_EMPRESA_LABELS} />
        <Group title="NF-e" data={nfe} labels={EXTRACT_NFE_LABELS} />
        <Group title="Impostos (1ª regra)" data={rule} labels={EXTRACT_RULE_LABELS} />
      </div>
    </div>
  );
}

/* ------------------------------- Abas NF-e -------------------------------- */

type StepProps = {
  form: NfeData;
  update: <K extends keyof NfeData>(key: K, value: NfeData[K]) => void;
};

function CadastraisTab({ form, update, xmlHints }: StepProps & { xmlHints?: Record<string, string> }) {
  const hints = xmlHints ?? {};
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900 flex items-start gap-2">
        <Check className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Os dados da empresa (Razão Social, CNPJ, certificado e contador) já foram preenchidos no
          <strong> Cadastro da Empresa</strong> e estão sendo reutilizados aqui. Esta aba é apenas
          para a <strong>numeração específica da NF-e</strong>.
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Número da última NF-e emitida"
          xmlHint={hints.ultima_nfe}
          onApplyHint={hints.ultima_nfe ? () => update("ultima_nfe", hints.ultima_nfe) : undefined}
        >
          <Input inputMode="numeric" value={form.ultima_nfe ?? ""} onChange={(e) => update("ultima_nfe", e.target.value.replace(/\D/g, ""))} placeholder="0" />
        </Field>
        <Field
          label="Série da última NF-e"
          xmlHint={hints.serie_nfe}
          onApplyHint={hints.serie_nfe ? () => update("serie_nfe", hints.serie_nfe) : undefined}
        >
          <Input inputMode="numeric" value={form.serie_nfe ?? ""} onChange={(e) => update("serie_nfe", e.target.value.replace(/\D/g, ""))} placeholder="1" />
        </Field>
      </div>
    </div>
  );
}

// ====== Cadastro Global da Empresa (Passo Um) ======
function EmpresaGlobalForm({
  empresa,
  update,
}: {
  empresa: EmpresaGlobal;
  update: <K extends keyof EmpresaGlobal>(key: K, value: EmpresaGlobal[K]) => void;
}) {
  const { token } = Route.useParams();
  const uploadCert = useServerFn(uploadCertificateByToken);
  const [certUploading, setCertUploading] = useState(false);

  async function onCert(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCertUploading(true);
    try {
      const buf = new Uint8Array(await f.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 8192) {
        bin += String.fromCharCode(...buf.subarray(i, i + 8192));
      }
      const res = await uploadCert({
        data: { token, file_name: f.name, content_base64: btoa(bin) },
      });
      update("certificado_arquivo", { name: res.name, size: res.size, path: res.path });
      toast.success("Certificado enviado com segurança.");
    } catch (err) {
      console.error("[cert upload]", err);
      toast.error(err instanceof Error ? err.message : "Falha ao enviar o certificado.");
    } finally {
      setCertUploading(false);
      e.target.value = "";
    }
  }
  const { loading: cnpjLoading, lookup } = useCnpjLookup((d) => {
    if (d.razao_social) update("razao_social", d.razao_social);
    const cnae = formatCnaeFromApi(d.cnae_fiscal);
    if (cnae) update("cnae_principal", cnae);
    if (d.cnae_fiscal_descricao) update("atividade_principal", d.cnae_fiscal_descricao);
  });
  return (
    <div className="bg-card border rounded-2xl p-4 md:p-6 shadow-sm space-y-6">
      <Section title="Identificação da Empresa">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Razão Social" className="md:col-span-2">
            <Input value={empresa.razao_social ?? ""} onChange={(e) => update("razao_social", e.target.value)} placeholder="Empresa LTDA" />
          </Field>
          <Field label="CNPJ / CPF">
            <CnpjInput
              value={empresa.cnpj_cpf ?? ""}
              onChange={(e) => {
                const formatted = formatCpfCnpj(e.target.value);
                update("cnpj_cpf", formatted);
                const digits = formatted.replace(/\D/g, "");
                if (digits.length === 14) {
                  lookup(digits);
                }
              }}
              onLookup={(v) => lookup(v, true)}
              loading={cnpjLoading}
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              maxLength={18}
            />
          </Field>
          <Field label="Inscrição Estadual">
            <Input value={empresa.inscricao_estadual ?? ""} onChange={(e) => update("inscricao_estadual", e.target.value)} placeholder="Isento ou número" />
          </Field>
          <Field label="Inscrição Municipal">
            <Input value={empresa.inscricao_municipal ?? ""} onChange={(e) => update("inscricao_municipal", e.target.value)} placeholder="Isento ou número" />
          </Field>
          <Field label="Atividade Principal" className="md:col-span-2">
            <Input value={empresa.atividade_principal ?? ""} onChange={(e) => update("atividade_principal", e.target.value)} placeholder="Ex.: Comércio varejista de..." />
          </Field>
          <Field label="CNAE Principal" help="Consulte o cartão CNPJ do cliente para confirmar a atividade principal.">
            <Input value={empresa.cnae_principal ?? ""} onChange={(e) => update("cnae_principal", formatCnae(e.target.value))} placeholder="0000-0/00" inputMode="numeric" maxLength={9} />
          </Field>
        </div>
      </Section>

      <Section title="Certificado Digital">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Certificado Digital PJ A1" className="md:col-span-2">
            <label className="flex items-center gap-3 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-muted/40 transition">
              {certUploading ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              ) : (
                <Upload className="h-4 w-4 text-primary" />
              )}
              <span className="text-sm flex-1 truncate">
                {certUploading
                  ? "Enviando certificado..."
                  : (empresa.certificado_arquivo?.name ?? "Anexar arquivo .pfx / .p12")}
              </span>
              {empresa.certificado_arquivo && !certUploading && (
                <span className="text-xs text-muted-foreground">
                  {Math.round(empresa.certificado_arquivo.size / 1024)} KB
                </span>
              )}
              <input type="file" accept=".pfx,.p12" className="hidden" disabled={certUploading} onChange={onCert} />
            </label>
          </Field>
          <Field label="Senha do Certificado">
            <Input type="password" value={empresa.certificado_senha ?? ""} onChange={(e) => update("certificado_senha", e.target.value)} placeholder="••••••••" />
          </Field>
          <Field label="">
            <span className="text-[11px] text-muted-foreground">A senha fica criptografada no envio.</span>
          </Field>
        </div>
      </Section>

      <Section title="Dados do Contador Responsável">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Telefone / WhatsApp do Contador (Obrigatório)" required>
            <Input 
              value={empresa.contador_telefone ?? ""} 
              onChange={(e) => update("contador_telefone", formatPhone(e.target.value))} 
              placeholder="(00) 00000-0000" 
              inputMode="tel" 
              maxLength={15}
              required
            />
          </Field>
          <Field label="Nome do Contador">
            <Input value={empresa.contador_nome ?? ""} onChange={(e) => update("contador_nome", e.target.value)} placeholder="Nome completo" />
          </Field>
          <Field label="E-mail do Contador" className="md:col-span-2">
            <Input type="email" value={empresa.contador_email ?? ""} onChange={(e) => update("contador_email", e.target.value)} placeholder="contador@escritorio.com.br" />
          </Field>
        </div>
      </Section>
    </div>
  );
}


function RegimeTab({ form, update }: StepProps) {
  const opts: { v: Regime; t: string; d: string }[] = [
    { v: "simples", t: "Simples Nacional", d: "ME / EPP — recolhimento unificado DAS." },
    { v: "mei", t: "MEI", d: "Microempreendedor Individual — CSOSN restrito." },
    { v: "normal", t: "Regime Normal", d: "Lucro Real/Presumido — CBS, IBS, ICMS, PIS/COFINS." },
  ];
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">
        A seleção abaixo define quais campos aparecerão nas próximas abas.
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {opts.map((opt) => (
          <button
            key={opt.v}
            type="button"
            onClick={() => update("regime", opt.v)}
            className={cn(
              "text-left rounded-xl border-2 p-4 transition-all hover:border-primary/40",
              form.regime === opt.v ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card",
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">{opt.t}</span>
              {form.regime === opt.v && <Check className="h-4 w-4 text-primary" />}
            </div>
            <p className="text-xs text-muted-foreground">{opt.d}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ReformaTributariaNfeTab({ form, update }: StepProps) {
  const [creditoOpen, setCreditoOpen] = useState(false);
  const selectedCount = form.credito_presumido_cbs_ibs?.length ?? 0;

  return (
    <div className="space-y-6">
      <Section title="Reforma Tributária (CBS / IBS / LC 214/2025) da NF-e">
        <p className="text-xs text-muted-foreground mb-4 break-words leading-relaxed">
          Campos oficiais de parametrização da NF-e conforme a Lei Complementar nº 214/2025 e o padrão nacional de tributação sobre o consumo (CBS / IBS).
        </p>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="CST CBS / IBS *">
              <Combobox
                options={CST_CBS_IBS_OPTIONS}
                value={form.cst_cbs}
                onChange={(v) => update("cst_cbs", v)}
                placeholder="Selecione o CST CBS/IBS..."
              />
            </Field>

            <Field label="Classificação Tributária (cClassTrib)">
              <Combobox
                options={C_CLASS_TRIB_OPTIONS}
                value={form.c_class_trib}
                onChange={(v) => update("c_class_trib", v)}
                placeholder="Selecione ou busque o código cClassTrib..."
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <PercentField
              label="Alíquota CBS (%)"
              value={form.aliquota_cbs}
              onChange={(v) => update("aliquota_cbs", v)}
            />
            <PercentField
              label="Alíquota IBS UF (%) *"
              value={form.aliquota_ibs_uf}
              onChange={(v) => update("aliquota_ibs_uf", v)}
            />
            <PercentField
              label="Alíquota IBS Município (%)"
              value={form.aliquota_ibs_mun}
              onChange={(v) => update("aliquota_ibs_mun", v)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <PercentField
              label="Diferimento IBS (%)"
              value={form.diferimento_ibs}
              onChange={(v) => update("diferimento_ibs", v)}
            />
            <PercentField
              label="Redução IBS (%) *"
              value={form.reducao_ibs}
              onChange={(v) => update("reducao_ibs", v)}
            />
          </div>

          {/* Quadro retrátil (Collapsible) para Crédito Presumido - 13 opções */}
          <div className="rounded-xl border bg-card shadow-xs overflow-hidden transition-all duration-200">
            <button
              type="button"
              onClick={() => setCreditoOpen(!creditoOpen)}
              className="w-full flex items-center justify-between p-3.5 md:p-4 text-left bg-muted/20 hover:bg-muted/40 transition cursor-pointer select-none gap-3"
              aria-expanded={creditoOpen}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Scale className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs md:text-sm font-semibold text-foreground">
                      Crédito Presumido (CBS / IBS) — LC 214/2025
                    </span>
                    {selectedCount > 0 ? (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                        {selectedCount} selecionada(s)
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full border">
                        Opcional • 13 hipóteses
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {creditoOpen
                      ? "Clique para recolher o quadro de opções"
                      : "Clique para expandir e selecionar hipóteses de crédito presumido"}
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center justify-center h-7 w-7 rounded-md bg-muted/60 text-muted-foreground">
                {creditoOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {creditoOpen && (
              <div className="p-3 md:p-4 border-t bg-muted/5 space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-border/50 gap-2">
                  <span className="text-xs text-muted-foreground">
                    Marque as hipóteses aplicáveis à operação:
                  </span>
                  {selectedCount > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        update("credito_presumido_cbs_ibs", []);
                      }}
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive shrink-0"
                    >
                      Limpar seleção
                    </Button>
                  )}
                </div>

                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {CREDITO_PRESUMIDO_LC214_OPTIONS.map((opt) => {
                    const current = form.credito_presumido_cbs_ibs ?? [];
                    const isChecked = current.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        className={cn(
                          "flex items-start gap-3 p-2.5 rounded-lg border transition cursor-pointer",
                          isChecked
                            ? "bg-primary/5 border-primary/40 shadow-xs"
                            : "bg-background border-border hover:bg-muted/40",
                        )}
                        onClick={() => {
                          const next = isChecked
                            ? current.filter((x) => x !== opt.id)
                            : [...current, opt.id];
                          update("credito_presumido_cbs_ibs", next);
                        }}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const next = checked
                              ? [...current, opt.id]
                              : current.filter((x) => x !== opt.id);
                            update("credito_presumido_cbs_ibs", next);
                          }}
                          className="mt-0.5 shrink-0"
                        />
                        <span className="text-xs md:text-sm text-foreground leading-relaxed select-none break-words min-w-0 flex-1 whitespace-normal">
                          {opt.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 pt-2">
            <PercentField
              label="Percentual Crédito Presumido CBS (%)"
              value={form.percentual_credito_presumido_cbs}
              onChange={(v) => update("percentual_credito_presumido_cbs", v)}
            />
            <PercentField
              label="Percentual Crédito Presumido IBS (%)"
              value={form.percentual_credito_presumido_ibs}
              onChange={(v) => update("percentual_credito_presumido_ibs", v)}
            />
          </div>

          <div className="pt-2">
            <Field label="Código Indicador da Operação de Fornecimento *">
              <Input
                value={form.codigo_indicador_operacao_fornecimento ?? ""}
                onChange={(e) => update("codigo_indicador_operacao_fornecimento", e.target.value)}
                placeholder="Informe o código indicador da operação..."
              />
            </Field>
          </div>
        </div>
      </Section>
    </div>
  );
}

function RegrasFiscaisTab({ form, update, xmlHints }: StepProps & { xmlHints?: Record<string, string> }) {
  const hints = xmlHints ?? {};
  if (!form.regime) return <EmptyRegime />;
  const rules = form.nfe_rules && form.nfe_rules.length > 0 ? form.nfe_rules : [makeEmptyRule("Regra Padrão")];

  function commit(next: FiscalRule[]) {
    update("nfe_rules", next);
  }
  function updateRule(id: string, patch: Partial<FiscalRule>) {
    commit(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addRule() {
    commit([...rules, makeEmptyRule(`Regra ${rules.length + 1}`)]);
  }
  function duplicateRule(id: string) {
    const idx = rules.findIndex((r) => r.id === id);
    if (idx === -1) return;
    const src = rules[idx];
    const clone: FiscalRule = { ...src, id: newRuleId(), nome: `${src.nome} (cópia)` };
    const next = [...rules];
    next.splice(idx + 1, 0, clone);
    commit(next);
  }
  function removeRule(id: string) {
    if (rules.length <= 1) {
      toast.error("A parametrização precisa ter ao menos uma regra fiscal.");
      return;
    }
    commit(rules.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-6">

      {form.smart_file && Object.keys(hints).length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Documento fiscal processado a partir de <em>{form.smart_file.name}</em>. Utilize os botões de{" "}
            <strong>inserção rápida</strong> ao lado de cada campo para preencher os dados sugeridos pelo documento{" "}
            <strong>após sua conferência técnica</strong>.
          </span>
        </div>
      )}

      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-900 flex items-start gap-2">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Crie <strong>uma regra por tipo de operação</strong> (ex.: <em>Venda Interna</em>, <em>Venda Interestadual</em>,
          <em> Devolução</em>). Se duas regras forem parecidas, use <strong>Duplicar</strong> e altere só o que muda.
        </span>
      </div>

      <div className="space-y-4">
        {rules.map((rule, idx) => (
          <RuleCard
            key={rule.id}
            index={idx}
            rule={rule}
            regime={form.regime!}
            onChange={(patch) => updateRule(rule.id, patch)}
            onDuplicate={() => duplicateRule(rule.id)}
            onRemove={() => removeRule(rule.id)}
            canRemove={rules.length > 1}
            xmlHints={hints}
          />
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addRule} className="gap-2 w-full md:w-auto">
        <Plus className="h-4 w-4" /> Adicionar Regra Fiscal
      </Button>
    </div>
  );
}

function RuleCard({
  index,
  rule,
  regime,
  onChange,
  onDuplicate,
  onRemove,
  canRemove,
  xmlHints,
}: {
  index: number;
  rule: FiscalRule;
  regime: Regime;
  onChange: (patch: Partial<FiscalRule>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  canRemove: boolean;
  xmlHints?: Record<string, string>;
}) {
  const isNormal = regime === "normal";
  const isMei = regime === "mei";
  const csosnOpts = isMei ? CSOSN_MEI_OPTIONS : CSOSN_OPTIONS;
  const upd = <K extends keyof FiscalRule>(key: K, value: FiscalRule[K]) => onChange({ [key]: value } as Partial<FiscalRule>);
  // Retorna props { xmlHint, onApplyHint } para um campo, se houver valor extraído do XML.
  // Só é sugerido no primeiro card (index 0) para não poluir cópias/regras adicionais.
  const hintFor = <K extends keyof FiscalRule>(k: K) => {
    if (index !== 0) return {};
    const v = xmlHints?.[k as string];
    if (!v) return {};
    return { xmlHint: v, onApplyHint: () => upd(k, v as unknown as FiscalRule[K]) };
  };

  return (
    <div className="border rounded-xl p-4 md:p-5 bg-card space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            Regra {index + 1}
          </Label>
          <Input
            value={rule.nome}
            onChange={(e) => upd("nome", e.target.value)}
            placeholder="Ex.: Venda Interna, Venda Interestadual, Devolução..."
            className="mt-1 font-semibold"
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onDuplicate} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" /> Duplicar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRemove}
            disabled={!canRemove}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remover
          </Button>
        </div>
      </div>

      <Section title={isNormal ? "ICMS — Contribuinte e Não Contribuinte" : "ICMS — CSOSN (Contribuinte & Não Contribuinte)"}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Indicador IE Destinatário Padrão" className="md:col-span-2">
            <Combobox
              options={IND_IE_DEST_OPTIONS}
              value={rule.ind_ie_dest}
              onChange={(v) => upd("ind_ie_dest", v)}
              placeholder="Selecione o perfil do destinatário..."
            />
          </Field>

          {!isNormal && (
            <>
              <Field label="CSOSN — Contribuinte (Com IE)" {...hintFor("csosn")}>
                <Combobox options={csosnOpts} value={rule.csosn} onChange={(v) => upd("csosn", v)} placeholder="Selecione o CSOSN p/ contribuinte..." />
              </Field>
              <Field label="CSOSN — Não Contribuinte (Sem IE / Consumidor Final)" {...hintFor("csosn_nao_contrib")}>
                <Combobox options={csosnOpts} value={rule.csosn_nao_contrib} onChange={(v) => upd("csosn_nao_contrib", v)} placeholder="Selecione o CSOSN p/ não contribuinte..." />
              </Field>
            </>
          )}
          {isNormal && (
            <>
              <Field label="CST ICMS — Contribuinte (Com IE)" {...hintFor("cst_icms_contrib")}>
                <Combobox options={CST_ICMS_OPTIONS} value={rule.cst_icms_contrib} onChange={(v) => upd("cst_icms_contrib", v)} placeholder="Selecione o CST p/ contribuinte..." />
              </Field>
              <Field label="CST ICMS — Não Contribuinte (Sem IE / Consumidor Final)" {...hintFor("cst_icms_nao_contrib")}>
                <Combobox options={CST_ICMS_OPTIONS} value={rule.cst_icms_nao_contrib} onChange={(v) => upd("cst_icms_nao_contrib", v)} placeholder="Selecione o CST p/ não contribuinte..." />
              </Field>
              <PercentField label="Alíquota ICMS — Contribuinte (%)" value={rule.aliquota_icms} onChange={(v) => upd("aliquota_icms", v)} {...hintFor("aliquota_icms")} />
              <PercentField label="Alíquota ICMS — Não Contribuinte (%)" value={rule.aliquota_icms_nao_contrib} onChange={(v) => upd("aliquota_icms_nao_contrib", v)} />
              <PercentField label="Redução BC ICMS — Contribuinte (%)" value={rule.reducao_bc_icms} onChange={(v) => upd("reducao_bc_icms", v)} {...hintFor("reducao_bc_icms")} />
              <PercentField label="Redução BC ICMS — Não Contribuinte (%)" value={rule.reducao_bc_icms_nao_contrib} onChange={(v) => upd("reducao_bc_icms_nao_contrib", v)} />
            </>
          )}

          {!isNormal && (
            <>
              <PercentField label="Alíquota ICMS (%)" value={rule.aliquota_icms} onChange={(v) => upd("aliquota_icms", v)} {...hintFor("aliquota_icms")} />
              <PercentField label="Redução BC ICMS (%)" value={rule.reducao_bc_icms} onChange={(v) => upd("reducao_bc_icms", v)} {...hintFor("reducao_bc_icms")} />
            </>
          )}

          <Field label="CFOP Estadual" {...hintFor("cfop_estadual")}>
            <Combobox
              options={CFOP_OPTIONS.filter((o) => o.hint?.includes("Estadual"))}
              value={rule.cfop_estadual}
              onChange={(v) => upd("cfop_estadual", v)}
            />
          </Field>
          <Field label="CFOP Interestadual (Contribuinte)" {...hintFor("cfop_interestadual")}>
            <Combobox
              options={CFOP_OPTIONS.filter((o) => o.hint?.includes("Interestadual") && !o.hint?.includes("Não Contrib."))}
              value={rule.cfop_interestadual}
              onChange={(v) => upd("cfop_interestadual", v)}
            />
          </Field>
          <Field label="CFOP Interestadual (Não Contribuinte — Ex: 6108)" className="md:col-span-2">
            <Combobox
              options={CFOP_OPTIONS.filter((o) => o.hint?.includes("Não Contrib."))}
              value={rule.cfop_nao_contrib_interestadual}
              onChange={(v) => upd("cfop_nao_contrib_interestadual", v)}
              placeholder="Ex.: 6108 - Venda a Não Contribuinte"
            />
          </Field>
        </div>

        <ToggleRow
          label="Operação Interestadual com Não Contribuinte sujeita a DIFAL / Partilha ICMS (EC 87/2015)?"
          checked={!!rule.usa_difal}
          onChange={(v) => upd("usa_difal", v)}
        />
        {rule.usa_difal && (
          <div className="grid gap-4 md:grid-cols-3 mt-3 p-3 rounded-lg border bg-muted/10">
            <PercentField
              label="Alíquota Interestadual (4%, 7% ou 12%)"
              value={rule.aliquota_icms_interestadual}
              onChange={(v) => upd("aliquota_icms_interestadual", v)}
            />
            <PercentField
              label="Alíquota Interna UF Destino (%)"
              value={rule.aliquota_icms_interna_destino}
              onChange={(v) => upd("aliquota_icms_interna_destino", v)}
            />
            <PercentField
              label="Alíquota FCP (%)"
              value={rule.aliquota_fcp}
              onChange={(v) => upd("aliquota_fcp", v)}
            />
          </div>
        )}

        <ToggleRow
          label="Possui MVA (Margem de Valor Agregado)?"
          checked={!!rule.usa_mva}
          onChange={(v) => upd("usa_mva", v)}
        />
        {rule.usa_mva && (
          <div className="mt-3">
            <PercentField label="MVA" value={rule.mva} onChange={(v) => upd("mva", v)} {...hintFor("mva")} />
          </div>
        )}
        <ToggleRow
          label="Substituição Tributária (ICMS-ST)?"
          checked={!!rule.substituicao_tributaria}
          onChange={(v) => upd("substituicao_tributaria", v)}
        />
        {rule.substituicao_tributaria && (
          <div className="mt-3">
            <PercentField label="Valor ICMS-ST" value={rule.valor_icms_st} onChange={(v) => upd("valor_icms_st", v)} {...hintFor("valor_icms_st")} />
          </div>
        )}
      </Section>

      <Section title="IPI">
        <ToggleRow label="Produto sujeito a IPI?" checked={!!rule.usa_ipi} onChange={(v) => upd("usa_ipi", v)} />
        {rule.usa_ipi && (
          <div className="grid gap-4 md:grid-cols-2 mt-3">
            <Field label="CST IPI Saída" {...hintFor("cst_ipi")}>
              <Combobox options={CST_IPI_SAIDA_OPTIONS} value={rule.cst_ipi} onChange={(v) => upd("cst_ipi", v)} searchPlaceholder="Digite o número ou nome do CST IPI..." />
            </Field>
            <PercentField label="Alíquota IPI" value={rule.aliquota_ipi} onChange={(v) => upd("aliquota_ipi", v)} {...hintFor("aliquota_ipi")} />
            <Field label="Código de Enquadramento (cEnq)" className="md:col-span-2" {...hintFor("ipi_cenq")}>
              <Combobox options={IPI_CENQ_OPTIONS} value={rule.ipi_cenq} onChange={(v) => upd("ipi_cenq", v)} searchPlaceholder="Digite o código ou descrição do cEnq..." />
            </Field>
          </div>
        )}
      </Section>

      <Section title="PIS / COFINS — Saída">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="CST PIS Saída" {...hintFor("cst_pis")}>
            <Combobox options={CST_PIS_COFINS_OPTIONS} value={rule.cst_pis} onChange={(v) => upd("cst_pis", v)} />
          </Field>
          <PercentField label="Alíquota PIS Saída" value={rule.aliquota_pis} onChange={(v) => upd("aliquota_pis", v)} {...hintFor("aliquota_pis")} />
          <Field label="CST COFINS Saída" {...hintFor("cst_cofins")}>
            <Combobox options={CST_PIS_COFINS_OPTIONS} value={rule.cst_cofins} onChange={(v) => upd("cst_cofins", v)} />
          </Field>
          <PercentField label="Alíquota COFINS Saída" value={rule.aliquota_cofins} onChange={(v) => upd("aliquota_cofins", v)} {...hintFor("aliquota_cofins")} />
        </div>
      </Section>
    </div>
  );
}


function NfceBlock({ form, update }: StepProps) {
  const isNormal = form.regime === "normal";
  const isMei = form.regime === "mei";
  const csosnOpts = isMei ? CSOSN_MEI_OPTIONS : CSOSN_OPTIONS;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-900 dark:text-amber-300">
            Token CSC (Código de Segurança do Contribuinte) — Obrigatório pela SEFAZ
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            O <strong>Token CSC</strong> e o <strong>ID do Token (cIdToken)</strong> são gerados diretamente no portal da SEFAZ do estado do contribuinte. Eles são necessários para a geração do <strong>QR Code 2.0</strong> e validação da NFC-e.
          </p>
        </div>
      </div>

      <Section title="Código de Segurança do Contribuinte (CSC)">
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            label="ID do Token CSC (cIdToken)"
            help="Identificador numérico do token gerado na SEFAZ (ex.: 000001 ou 1)."
            required
          >
            <Input
              value={form.nfce_csc_id ?? ""}
              onChange={(e) => update("nfce_csc_id", e.target.value.trim())}
              placeholder="Ex.: 000001"
              className="font-mono"
            />
          </Field>

          <Field
            label="Código / Chave CSC (Token)"
            help="Sequência alfanumérica/hash de 36 caracteres fornecida pela SEFAZ."
            required
            className="md:col-span-2"
          >
            <Input
              value={form.nfce_csc_codigo ?? ""}
              onChange={(e) => update("nfce_csc_codigo", e.target.value.trim())}
              placeholder="Ex.: A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6"
              className="font-mono text-xs"
            />
          </Field>

          <Field label="Ambiente do CSC" className="md:col-span-3">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="nfce_csc_ambiente"
                  checked={form.nfce_csc_ambiente !== "homologacao"}
                  onChange={() => update("nfce_csc_ambiente", "producao")}
                  className="accent-primary"
                />
                <span className="font-medium">Produção (Emissão com validade jurídica)</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="nfce_csc_ambiente"
                  checked={form.nfce_csc_ambiente === "homologacao"}
                  onChange={() => update("nfce_csc_ambiente", "homologacao")}
                  className="accent-primary"
                />
                <span className="font-medium text-muted-foreground">Homologação (Testes)</span>
              </label>
            </div>
          </Field>
        </div>
      </Section>

      <Section title="Numeração e Série da NFC-e">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Número da última NFC-e emitida" help="Caso seja a primeira emissão neste PDV, informe 0.">
            <Input
              inputMode="numeric"
              value={form.nfce_ultima_nfe ?? ""}
              onChange={(e) => update("nfce_ultima_nfe", e.target.value.replace(/\D/g, ""))}
              placeholder="0"
            />
          </Field>
          <Field label="Série da NFC-e" help="Série padrão geralmente é 1, 65 ou definida pelo cliente.">
            <Input
              inputMode="numeric"
              value={form.nfce_serie ?? ""}
              onChange={(e) => update("nfce_serie", e.target.value.replace(/\D/g, ""))}
              placeholder="1"
            />
          </Field>
        </div>
      </Section>

      <Section title="Regras Tributárias da NFC-e">
        <div className="grid gap-4 md:grid-cols-2">
          {!isNormal && (
            <Field label="CSOSN Padrão NFC-e" className="md:col-span-2">
              <Combobox
                options={csosnOpts}
                value={form.nfce_csosn}
                onChange={(v) => update("nfce_csosn", v)}
              />
            </Field>
          )}

          {isNormal && (
            <Field label="CST ICMS Padrão NFC-e" className="md:col-span-2">
              <Combobox
                options={CST_ICMS_OPTIONS}
                value={form.nfce_cst}
                onChange={(v) => update("nfce_cst", v)}
              />
            </Field>
          )}

          <Field label="CFOP Padrão NFC-e (Operação Estadual)">
            <Combobox
              options={CFOP_OPTIONS.filter((o) => o.hint === "Estadual")}
              value={form.nfce_cfop}
              onChange={(v) => update("nfce_cfop", v)}
            />
          </Field>

          <PercentField
            label="Alíquota ICMS NFC-e"
            value={form.nfce_aliquota_icms}
            onChange={(v) => update("nfce_aliquota_icms", v)}
          />
        </div>

        <ToggleRow
          label="Produtos com Substituição Tributária (ICMS-ST) no Cupom?"
          checked={!!form.nfce_substituicao_tributaria}
          onChange={(v) => update("nfce_substituicao_tributaria", v)}
        />
        {form.nfce_substituicao_tributaria && (
          <div className="mt-3">
            <PercentField
              label="Alíquota / Valor ICMS-ST NFC-e"
              value={form.nfce_valor_icms_st}
              onChange={(v) => update("nfce_valor_icms_st", v)}
            />
          </div>
        )}
      </Section>

      <Section title="Reforma Tributária (CBS / IBS / LC 214/2025) da NFC-e">
        <p className="text-xs text-muted-foreground mb-3 break-words leading-relaxed">
          Parametrização de CBS/IBS para operações no varejo / cupom fiscal de acordo com a LC 214/2025.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="CST CBS / IBS Padrão NFC-e">
            <Combobox
              options={CST_CBS_IBS_OPTIONS}
              value={form.nfce_cst_cbs_ibs}
              onChange={(v) => update("nfce_cst_cbs_ibs", v)}
              placeholder="Selecione o CST CBS/IBS..."
            />
          </Field>

          <Field label="Classificação Tributária (cClassTrib)">
            <Combobox
              options={C_CLASS_TRIB_OPTIONS}
              value={form.nfce_c_class_trib}
              onChange={(v) => update("nfce_c_class_trib", v)}
              placeholder="Selecione ou busque o código cClassTrib..."
            />
          </Field>

          <PercentField
            label="Alíquota CBS NFC-e (%)"
            value={form.nfce_aliquota_cbs}
            onChange={(v) => update("nfce_aliquota_cbs", v)}
          />

          <PercentField
            label="Alíquota IBS UF NFC-e (%)"
            value={form.nfce_aliquota_ibs_uf}
            onChange={(v) => update("nfce_aliquota_ibs_uf", v)}
          />

          <PercentField
            label="Redução IBS NFC-e (%)"
            value={form.nfce_reducao_ibs}
            onChange={(v) => update("nfce_reducao_ibs", v)}
          />

          <PercentField
            label="Diferimento IBS NFC-e (%)"
            value={form.nfce_diferimento_ibs}
            onChange={(v) => update("nfce_diferimento_ibs", v)}
          />
        </div>
      </Section>

      <Section title="Mensagens do Cupom Fiscal (Rodapé)">
        <Field
          label="Informações Adicionais do Cupom / Lei da Transparência (IBPT)"
          help="Texto impresso no rodapé do cupom fiscal (ex.: 'Trib aprox R$ 0,00 Federal e R$ 0,00 Estadual - Fonte: IBPT')."
        >
          <Textarea
            value={form.nfce_msg_cupom ?? ""}
            onChange={(e) => update("nfce_msg_cupom", e.target.value)}
            rows={3}
            placeholder="Ex.: Trib aprox R$ ... Federal e R$ ... Estadual - Fonte: IBPT. Documento emitido por ME ou EPP optante pelo Simples Nacional."
          />
        </Field>
      </Section>
    </div>
  );
}

/* ----------------------------- Primitives ---------------------------- */

function EmptyRegime() {
  return (
    <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
      Selecione o regime tributário na aba <strong>Regime</strong> para liberar estes campos.
    </div>
  );
}

function Field({
  label,
  children,
  className,
  help,
  xmlHint,
  onApplyHint,
  required,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  help?: string;
  xmlHint?: string;
  onApplyHint?: () => void;
  required?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            {label} {required && <span className="text-red-500 font-bold">*</span>}
          </Label>
          {xmlHint && onApplyHint && (
            <button
              type="button"
              onClick={onApplyHint}
              title="Copiar valor extraído do XML para este campo"
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 px-2 py-0.5 text-[10px] font-semibold transition-colors"
            >
              <Copy className="h-3 w-3" /> Inserir: {xmlHint}
            </button>
          )}
          {help && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground/70 hover:text-foreground transition-colors" aria-label="Ajuda">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs leading-relaxed">{help}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function PercentField({
  label,
  value,
  onChange,
  help,
  xmlHint,
  onApplyHint,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  help?: string;
  xmlHint?: string;
  onApplyHint?: () => void;
}) {
  return (
    <Field label={label} help={help} xmlHint={xmlHint} onApplyHint={onApplyHint}>
      <div className="relative">
        <Input
          inputMode="decimal"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, "").replace(/\./g, ","))}
          onBlur={(e) => {
            const raw = e.target.value.replace(",", ".");
            const n = parseFloat(raw);
            if (!isNaN(n)) onChange(n.toFixed(2).replace(".", ","));
          }}
          placeholder="0,00"
          className="pr-8"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
      </div>
    </Field>
  );
}


/* --------------------------- Máscaras (Input) --------------------------- */

function formatCpfCnpj(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) =>
      [a && `(${a}`, a && a.length === 2 ? ") " : "", b, c && `-${c}`].filter(Boolean).join(""),
    );
  }
  return d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
}

function formatCnae(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 7);
  return d
    .replace(/^(\d{4})(\d)/, "$1-$2")
    .replace(/^(\d{4})-(\d{1})(\d)/, "$1-$2/$3");
}

/* --------------------------- Resumo da Parametrização --------------------------- */

function ReviewSummary({ form, empresa, showNfce, hideEmpresa }: { form: NfeData; empresa?: EmpresaGlobal; showNfce: boolean; hideEmpresa?: boolean }) {
  const e = empresa ?? {};
  const regimeLabel = form.regime === "simples" ? "Simples Nacional" : form.regime === "mei" ? "MEI" : form.regime === "normal" ? "Regime Normal" : undefined;
  const groups: { title: string; rows: { label: string; value?: string | boolean }[] }[] = [];
  if (!hideEmpresa) {
    groups.push(
      {
        title: "Cadastro Global da Empresa",
        rows: [
          { label: "Razão Social", value: e.razao_social ?? form.razao_social },
          { label: "CNPJ / CPF", value: e.cnpj_cpf ?? form.cnpj_cpf },
          { label: "Inscrição Estadual", value: e.inscricao_estadual ?? form.inscricao_estadual },
          { label: "Inscrição Municipal", value: e.inscricao_municipal ?? form.inscricao_municipal },
          { label: "Atividade Principal", value: e.atividade_principal ?? form.atividade_principal },
          { label: "CNAE Principal", value: e.cnae_principal ?? form.cnae_principal },
          { label: "Certificado A1", value: (e.certificado_arquivo ?? form.certificado_arquivo)?.name },
        ],
      },
      {
        title: "Contador Responsável",
        rows: [
          { label: "Telefone / WhatsApp", value: e.contador_telefone ?? form.contador_telefone },
          { label: "Nome", value: e.contador_nome ?? form.contador_nome },
          { label: "E-mail", value: e.contador_email ?? form.contador_email },
        ],
      },
    );
  }
  groups.push({
    title: "Numeração NF-e",
    rows: [
      { label: "Última NF-e", value: form.ultima_nfe },
      { label: "Série", value: form.serie_nfe },
    ],
  });
  groups.push({
    title: "Regime",
    rows: [{ label: "Regime", value: regimeLabel }],
  });
  const rules = form.nfe_rules ?? [];
  rules.forEach((rule, idx) => {
    const rows: { label: string; value?: string | boolean }[] = [
      { label: "Indicador IE Destinatário", value: rule.ind_ie_dest ? (rule.ind_ie_dest === "1" ? "1 — Contribuinte" : rule.ind_ie_dest === "2" ? "2 — Isento" : "9 — Não Contribuinte") : undefined },
      { label: "CSOSN Contribuinte", value: rule.csosn },
      { label: "CSOSN Não Contribuinte", value: rule.csosn_nao_contrib },
      { label: "CST ICMS Contribuinte", value: rule.cst_icms_contrib },
      { label: "CST ICMS Não Contribuinte", value: rule.cst_icms_nao_contrib },
      { label: "Origem da Mercadoria", value: rule.origem_mercadoria },
      { label: "Mod. BC ICMS", value: rule.mod_bc_icms },
      { label: "Valor BC ICMS", value: rule.valor_bc_icms },
      { label: "Alíquota ICMS (Contribuinte)", value: rule.aliquota_icms && `${rule.aliquota_icms}%` },
      { label: "Alíquota ICMS (Não Contribuinte)", value: rule.aliquota_icms_nao_contrib && `${rule.aliquota_icms_nao_contrib}%` },
      { label: "Valor ICMS", value: rule.valor_icms },
      { label: "Redução BC ICMS (Contribuinte)", value: rule.reducao_bc_icms && `${rule.reducao_bc_icms}%` },
      { label: "Redução BC ICMS (Não Contribuinte)", value: rule.reducao_bc_icms_nao_contrib && `${rule.reducao_bc_icms_nao_contrib}%` },
      { label: "CFOP Estadual", value: rule.cfop_estadual },
      { label: "CFOP Interestadual (Contribuinte)", value: rule.cfop_interestadual },
      { label: "CFOP Interestadual (Não Contribuinte)", value: rule.cfop_nao_contrib_interestadual },
      { label: "DIFAL (Partilha ICMS Não Contrib.)", value: rule.usa_difal ? `Sim · Inter ${rule.aliquota_icms_interestadual ?? "0"}% · Destino ${rule.aliquota_icms_interna_destino ?? "0"}% · FCP ${rule.aliquota_fcp ?? "0"}%` : undefined },
      { label: "MVA", value: rule.usa_mva ? (rule.mva ? `${rule.mva}%` : "Sim") : undefined },
      { label: "Substituição Tributária", value: rule.substituicao_tributaria ? (rule.valor_icms_st ? `Sim · ${rule.valor_icms_st}` : "Sim") : undefined },
      { label: "IPI", value: rule.usa_ipi ? `CST ${rule.cst_ipi ?? "—"} · ${rule.aliquota_ipi ?? "0"}%` : undefined },
      { label: "cEnq IPI", value: rule.ipi_cenq },
      { label: "CST PIS / Alíquota", value: [rule.cst_pis, rule.aliquota_pis && `${rule.aliquota_pis}%`].filter(Boolean).join(" · ") || undefined },
      { label: "CST COFINS / Alíquota", value: [rule.cst_cofins, rule.aliquota_cofins && `${rule.aliquota_cofins}%`].filter(Boolean).join(" · ") || undefined },
    ].filter((r) => r.value !== undefined && r.value !== null && r.value !== "");
    if (rows.length === 0) return;
    groups.push({ title: `Regra Fiscal ${idx + 1}: ${rule.nome || "Sem nome"}`, rows });
  });
  const hasCbs = form.cst_cbs || form.aliquota_cbs || form.aliquota_ibs_uf || form.c_class_trib;
  if (hasCbs) {
    groups.push({
      title: "Reforma Tributária (CBS / IBS / LC 214/2025)",
      rows: [
        { label: "CST CBS/IBS", value: form.cst_cbs },
        { label: "Classificação Tributária (cClassTrib)", value: form.c_class_trib },
        { label: "Alíquota CBS", value: form.aliquota_cbs && `${form.aliquota_cbs}%` },
        { label: "Alíquota IBS UF", value: form.aliquota_ibs_uf && `${form.aliquota_ibs_uf}%` },
        { label: "Alíquota IBS Município", value: form.aliquota_ibs_mun && `${form.aliquota_ibs_mun}%` },
        { label: "Diferimento IBS", value: form.diferimento_ibs && `${form.diferimento_ibs}%` },
        { label: "Redução IBS", value: form.reducao_ibs && `${form.reducao_ibs}%` },
        { label: "Crédito Presumido (CBS/IBS)", value: form.credito_presumido_cbs_ibs?.length ? `${form.credito_presumido_cbs_ibs.length} hipótese(s) selecionada(s)` : undefined },
        { label: "Percentual Crédito CBS", value: form.percentual_credito_presumido_cbs && `${form.percentual_credito_presumido_cbs}%` },
        { label: "Percentual Crédito IBS", value: form.percentual_credito_presumido_ibs && `${form.percentual_credito_presumido_ibs}%` },
        { label: "Código Indicador da Operação", value: form.codigo_indicador_operacao_fornecimento },
      ],
    });
  }
  if (showNfce) {
    groups.push({
      title: "NFC-e & Token CSC",
      rows: [
        { label: "ID do Token CSC (cIdToken)", value: form.nfce_csc_id },
        { label: "Código / Chave CSC", value: form.nfce_csc_codigo },
        { label: "Ambiente do CSC", value: form.nfce_csc_ambiente === "homologacao" ? "Homologação" : "Produção" },
        { label: "Última NFC-e", value: form.nfce_ultima_nfe },
        { label: "Série NFC-e", value: form.nfce_serie },
        { label: "CSOSN NFC-e", value: form.nfce_csosn },
        { label: "CST ICMS NFC-e", value: form.nfce_cst },
        { label: "CFOP Padrão NFC-e", value: form.nfce_cfop },
        { label: "Alíquota ICMS NFC-e", value: form.nfce_aliquota_icms && `${form.nfce_aliquota_icms}%` },
        { label: "ICMS-ST NFC-e", value: form.nfce_substituicao_tributaria ? (form.nfce_valor_icms_st ? `Sim · ${form.nfce_valor_icms_st}` : "Sim") : undefined },
        { label: "CST CBS/IBS NFC-e", value: form.nfce_cst_cbs_ibs },
        { label: "cClassTrib NFC-e", value: form.nfce_c_class_trib },
        { label: "Alíquota CBS NFC-e", value: form.nfce_aliquota_cbs && `${form.nfce_aliquota_cbs}%` },
        { label: "Alíquota IBS NFC-e", value: form.nfce_aliquota_ibs_uf && `${form.nfce_aliquota_ibs_uf}%` },
        { label: "Mensagem do Cupom (IBPT)", value: form.nfce_msg_cupom },
      ],
    });
  }

  return (
    <div className="border rounded-xl p-4 md:p-5 bg-muted/20">
      <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
        <Check className="h-4 w-4 text-emerald-600" /> Resumo da Parametrização
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Confira os dados preenchidos antes de enviar. Você ainda pode voltar a qualquer aba para ajustar.
      </p>
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.title}>
            <h4 className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground mb-2">{g.title}</h4>
            <dl className="grid gap-x-4 gap-y-1.5 md:grid-cols-2 text-sm">
              {g.rows.map((r) => (
                <div key={r.label} className="flex items-start justify-between gap-3 border-b border-border/40 py-1">
                  <dt className="text-muted-foreground">{r.label}</dt>
                  <dd className={cn("text-right font-medium break-words", !r.value && "text-muted-foreground/50 italic font-normal")}>
                    {r.value ? String(r.value) : "Não informado"}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 bg-muted/30 rounded-lg px-3 py-2.5 mt-3 cursor-pointer">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

export function isValidCpf(v: string): boolean {
  const d = (v || "").replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (base: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += parseInt(base[i], 10) * (factor - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(d.slice(0, 9), 10) === parseInt(d[9], 10) && calc(d.slice(0, 10), 11) === parseInt(d[10], 10);
}

export function isValidFullName(v: string): boolean {
  const parts = (v || "").trim().split(/\s+/).filter((p) => p.length >= 2);
  return parts.length >= 2;
}

function ComplianceTerm({
  checked, onChecked, name, onName, cpf, onCpf,
}: {
  checked: boolean;
  onChecked: (v: boolean) => void;
  name: string;
  onName: (v: string) => void;
  cpf: string;
  onCpf: (v: string) => void;
}) {
  function formatCpf(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 11);
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  const nameOk = isValidFullName(name);
  const cpfOk = isValidCpf(cpf);
  return (
    <div className="border-2 border-amber-300 bg-amber-50/60 rounded-xl p-4 md:p-5 space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2 text-amber-900">
        <ShieldCheck className="h-4 w-4" /> Termo de Responsabilidade e Conformidade
      </h3>
      <p className="text-xs text-amber-900/80 leading-relaxed">
        Este aceite possui validade jurídica como assinatura eletrônica nos termos da legislação vigente
        (Lei nº 14.063/2020). Para fins de auditoria e conformidade fiscal, registramos de forma mandatória
        o Nome Completo, CPF, data/hora exata e o endereço IP do profissional contábil responsável pelo
        envio deste questionário.
      </p>
      <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <span>
          Declaro que <strong>revisei todas as informações</strong> e assumo a
          <strong> responsabilidade técnica </strong> pelas parametrizações fiscais enviadas.
        </span>
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Nome completo (assinatura)</Label>
          <Input
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder="Ex.: João da Silva"
            className="font-serif italic"
          />
          {name && !nameOk && (
            <p className="text-[11px] text-red-600">Informe nome e sobrenome.</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">CPF do responsável</Label>
          <Input
            value={cpf}
            onChange={(e) => onCpf(formatCpf(e.target.value))}
            inputMode="numeric"
            placeholder="000.000.000-00"
            maxLength={14}
          />
          {cpf && !cpfOk && (
            <p className="text-[11px] text-red-600">CPF inválido.</p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-amber-200/60">
        Ao clicar em <strong>&quot;Assinar e Enviar&quot;</strong>, o profissional declara estar
        ciente de que: <strong>1)</strong> A exatidão dos dados inseridos impactará
        diretamente a apuração de impostos da empresa cliente. <strong>2)</strong>{" "}
        Inconsistências provocadas por dolo ou erro crasso são de inteira responsabilidade
        técnica do declarante. <strong>3)</strong> Este registro eletrônico constitui prova
        inequívoca de autoria para fins de compliance.
      </p>
    </div>
  );
}

function FinalActionFooter({
  canFinish, onFinish, saving,
}: {
  canFinish: boolean;
  onFinish: () => void | Promise<void>;
  saving?: boolean;
}) {
  const disabledReason = "Certifique-se de que o Telefone do Contador (com DDD) e os dados da assinatura (Termo, Nome e CPF) foram preenchidos corretamente.";

  return (
    <TooltipProvider delayDuration={150}>
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.15)]">
        <div className="max-w-4xl mx-auto px-4 py-3 md:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className={cn("h-4 w-4", canFinish ? "text-emerald-600" : "text-muted-foreground")} />
            <span className="text-[11px] md:text-xs">
              {canFinish 
                ? "Termo assinado e pronto para envio." 
                : "Assinatura pendente na aba 'Final'."}
            </span>
          </div>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  onClick={() => canFinish && onFinish()}
                  disabled={!canFinish}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 h-10 px-8"
                  aria-disabled={!canFinish}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Assinar e Enviar Parametrização
                </Button>
              </span>
            </TooltipTrigger>
            {!canFinish && (
              <TooltipContent side="top">
                <p className="text-xs max-w-[240px]">{disabledReason}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-xl p-4 md:p-5">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" /> {title}
      </h3>
      {children}
    </div>
  );
}

function ModuleKeyValues({ title, data }: { title: string; data: Record<string, any> }) {
  const entries = Object.entries(data ?? {}).filter(
    ([, v]) => v !== undefined && v !== null && v !== "" && !(typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0),
  );
  const fmt = (v: any): string => {
    if (typeof v === "boolean") return v ? "Sim" : "Não";
    if (v === "independente") return "TAC Independente";
    if (v === "agregado") return "TAC Agregado";
    if (v === "equiparado") return "TAC Equiparado";
    if (v === "a_vista") return "À Vista";
    if (v === "a_prazo") return "A Prazo";
    if (v === "ipef") return "Cartão Frete / IPEF";
    if (v === "pix") return "PIX / Conta Bancária";
    if (Array.isArray(v)) return v.join(", ");
    if (typeof v === "object") return v.name ? String(v.name) : JSON.stringify(v);
    return String(v);
  };
  const CUSTOM_LABELS: Record<string, string> = {
    regime_tributario: "Regime Tributário",
    regime: "Regime Tributário",
    rntrc: "RNTRC (ou ANTT)",
    mdfe_rntrc: "RNTRC (ou ANTT)",
    uf_placa: "UF da Placa",
    mdfe_uf_placa: "UF da Placa",
    placa: "Placa do Veículo",
    mdfe_placa: "Placa do Veículo",
    renavam: "Renavam",
    mdfe_renavam: "Renavam",
    tipo_rodado: "Tipo de Rodado",
    mdfe_tipo_rodado: "Tipo de Rodado",
    tipo_carroceria: "Tipo de Carroceria",
    mdfe_tipo_carroceria: "Tipo de Carroceria",
    tipo_propriedade: "Tipo de Propriedade",
    mdfe_tipo_propriedade: "Tipo de Propriedade",
    tipo_veiculo: "Tipo de Veículo",
    mdfe_tipo_veiculo: "Tipo de Veículo",
    mdfe_tipo_emitente: "Tipo de Emitente",
    mdfe_tipo_transportador: "Tipo de Transportador",
    mdfe_tac_subtipo: "Subtipo de TAC (ANTT)",
    mdfe_ultimo_numero: "Último Manifesto (MDF-e)",
    mdfe_ultima_serie: "Série do MDF-e",
    ultimo_cte: "Último CT-e Emitido",
    serie_cte: "Série do CT-e",
    chaves_referenciadas: "Chaves Referenciadas (CT-e)",
    mdfe_chaves_referenciadas: "Chaves Referenciadas (MDF-e)",
    mdfe_motorista: "Motorista",
    mdfe_seguradora_nome: "Nome da Seguradora",
    mdfe_seguradora_cnpj: "CNPJ da Seguradora",
    mdfe_seguradora_apolice: "Número da Apólice",
    mdfe_proprietario_nome: "Nome do Proprietário",
    mdfe_proprietario_doc: "CPF/CNPJ do Proprietário",
    mdfe_proprietario_endereco: "Endereço do Proprietário",
    mdfe_tac_ciot: "CIOT",
    mdfe_tac_ciot_resp_doc: "Responsável pelo CIOT",
    mdfe_tac_nome: "Nome do TAC (Autônomo)",
    mdfe_tac_cpf: "CPF do TAC (Autônomo)",
    mdfe_tac_rntrc: "RNTRC do TAC",
    mdfe_tac_forma_pagto: "Forma de Pagamento (TAC)",
    mdfe_tac_valor_frete: "Valor Total do Frete (R$)",
    mdfe_tac_valor_adiantamento: "Valor Adiantamento (R$)",
    mdfe_tac_valor_saldo: "Saldo de Quitação (R$)",
    mdfe_tac_ipef_cnpj: "CNPJ da IPEF",
    mdfe_tac_ipef_nome: "Nome da IPEF",
    mdfe_tac_dados_bancarios: "Dados Bancários / PIX do TAC",
    mdfe_tac_usa_vale_pedagio: "Vale-Pedágio Obrigatório",
    mdfe_tac_vale_pedagio_fornecedora: "Fornecedora do Vale-Pedágio",
    mdfe_tac_vale_pedagio_resp_doc: "Responsável pelo Vale-Pedágio",
    mdfe_tac_vale_pedagio_numero: "Nº Comprovante Vale-Pedágio",
    mdfe_tac_vale_pedagio_valor: "Valor do Vale-Pedágio (R$)",
  };
  const label = (k: string) => CUSTOM_LABELS[k] ?? k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <div className="border rounded-xl p-4 md:p-5 bg-muted/20">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Check className="h-4 w-4 text-emerald-600" /> Resumo {title}
      </h3>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Sem dados preenchidos.</p>
      ) : (
        <dl className="grid gap-x-4 gap-y-1.5 md:grid-cols-2 text-sm">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-3 border-b border-border/40 py-1">
              <dt className="text-muted-foreground">{label(k)}</dt>
              <dd className="text-right font-medium break-words">{fmt(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function EmpresaGlobalSummary({ empresa }: { empresa?: EmpresaGlobal }) {
  const e = empresa ?? {};
  const groups: { title: string; rows: { label: string; value?: string }[] }[] = [
    {
      title: "Cadastro Global da Empresa",
      rows: [
        { label: "Razão Social", value: e.razao_social },
        { label: "Nome Fantasia", value: (e as any).nome_fantasia },
        { label: "CNPJ / CPF", value: e.cnpj_cpf },
        { label: "Inscrição Estadual", value: e.inscricao_estadual },
        { label: "Inscrição Municipal", value: e.inscricao_municipal },
        { label: "Atividade Principal", value: e.atividade_principal },
        { label: "CNAE Principal", value: e.cnae_principal },
        { label: "Endereço", value: (e as any).endereco },
        { label: "CEP", value: (e as any).cep },
        { label: "Município / UF", value: [(e as any).municipio, (e as any).uf].filter(Boolean).join(" / ") || undefined },
        { label: "Telefone", value: (e as any).telefone },
        { label: "E-mail", value: (e as any).email },
        { label: "Certificado Digital A1", value: e.certificado_arquivo?.name },
        { label: "Senha do Certificado", value: e.certificado_senha ? "••••••••" : undefined },
      ],
    },
    {
      title: "Contador Responsável",
      rows: [
        { label: "Telefone / WhatsApp", value: e.contador_telefone },
        { label: "Nome", value: e.contador_nome },
        { label: "E-mail", value: e.contador_email },
      ],
    },
  ];
  return (
    <div className="border rounded-xl p-4 md:p-5 bg-muted/20">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Check className="h-4 w-4 text-emerald-600" /> Dados da Empresa & Contador
      </h3>
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.title}>
            <h4 className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground mb-2">{g.title}</h4>
            <dl className="grid gap-x-4 gap-y-1.5 md:grid-cols-2 text-sm">
              {g.rows.map((r) => (
                <div key={r.label} className="flex items-start justify-between gap-3 border-b border-border/40 py-1">
                  <dt className="text-muted-foreground">{r.label}</dt>
                  <dd className={cn("text-right font-medium break-words", !r.value && "text-muted-foreground/50 italic font-normal")}>
                    {r.value ? String(r.value) : "Não informado"}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
