import { Check, FileText, Upload, FileUp, CheckCircle2, X, Info, Sparkles, Scale, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CnpjInput } from "@/components/parametrizacao/cnpj-input";
import { useCnpjLookup, formatCnaeFromApi } from "@/hooks/use-cnpj-lookup";
import { C_CLASS_TRIB_OPTIONS, CFOP_OPTIONS } from "@/lib/fiscal-options";

export type NfseData = {
  // Regime Tributário Federal
  regime?: "simples" | "mei" | "normal" | string;

  // Aba 1 — Empresa
  razao_social?: string;
  cnpj_cpf?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  certificado_arquivo?: { name: string; size: number };
  certificado_senha?: string;
  prefeitura_login?: string;
  prefeitura_senha?: string;

  // Reforma Tributária (CBS / IBS / LC 214/2025)
  cbs_ibs_nfse?: string;
  c_class_trib?: string;
  aliquota_cbs?: string;
  aliquota_ibs_uf?: string;
  diferimento_ibs?: string;
  reducao_ibs?: string;
  credito_presumido_cbs_ibs?: string[];
  percentual_credito_presumido_cbs?: string;
  percentual_credito_presumido_ibs?: string;
  codigo_indicador_operacao_fornecimento?: string;

  // Aba 2 — Numeração e códigos
  ultimo_rps?: string;
  serie_rps?: string;
  codigo_nbs?: string;
  codigo_cnae?: string;
  codigo_tributacao_municipio?: string;
  codigo_item_lista_servico?: string;
  municipio_prestacao?: string;
  codigo_contribuinte?: string;
  codigo_item_livre?: string;
  cfop_entrada?: string;
  codigo_cfop?: string;
  incentivador_cultural?: boolean;

  // Aba 3 — Alíquotas
  aliquotas_ibs_municipios?: string;
  aliquota_iss?: string;
  aprox_tributos_nacional?: string;
  aprox_tributos_estadual?: string;
  aprox_tributos_municipal?: string;

  // Aba 4 — Enquadramento
  tipo_tributacao?: string;
  exigibilidade_iss?: string;
  natureza_tributacao_rps?: string;
  regime_especial_rps?: string;
  situacao_tributaria?: string;

  // Aba 5
  observacoes?: string;

  // Emissão NFS-e — Upload da contabilidade e identificação da nota
  anexo_contabilidade?: { name: string; size: number };
  numero_nota?: string;
  numero_serie?: string;
  numero_rps?: string;
  numero_dps?: string;
};

type Props = {
  form: NfseData;
  update: <K extends keyof NfseData>(key: K, value: NfseData[K]) => void;
  onFinish: () => void;
  hideFinishButton?: boolean;
  hideEmpresa?: boolean;
};

const ALL_NFSE_TABS = [
  { key: "empresa", label: "Empresa & Prefeitura" },
  { key: "reforma", label: "Reforma Tributária (CBS/IBS)" },
  { key: "codigos", label: "Numeração & Códigos" },
  { key: "aliquotas", label: "Alíquotas & ISS" },
  { key: "enquadramento", label: "Regime & Enquadramento" },
  { key: "final", label: "Final" },
] as const;

export const CBS_IBS_NFSE_OPTIONS: ComboboxOption[] = [
  { value: "000", label: "000 — Tributação integral" },
  { value: "010", label: "010 — Tributação com alíquotas uniformes - operações do FGTS" },
  { value: "011", label: "011 — Tributação com alíquotas uniformes reduzidas em 60%" },
  { value: "200_zero", label: "200 — Alíquota zero" },
  { value: "200_cbs_red_ibs", label: "200 — Alíquota zero apenas CBS e reduzida em 60% para IBS" },
  { value: "200_red_80", label: "200 — Alíquota reduzida em 80%" },
  { value: "200_red_70", label: "200 — Alíquota reduzida em 70%" },
  { value: "200_red_60", label: "200 — Alíquota reduzida em 60%" },
  { value: "200_red_50", label: "200 — Alíquota reduzida em 50%" },
  { value: "200_red_40", label: "200 — Alíquota reduzida em 40%" },
  { value: "200_red_30", label: "200 — Alíquota reduzida em 30%" },
  { value: "221", label: "221 — Alíquota fixa proporcional" },
  { value: "400", label: "400 — Isenção" },
  { value: "410", label: "410 — Imunidade e não incidência" },
];

export const CREDITO_PRESUMIDO_LC214_OPTIONS = [
  {
    id: "1 - Aquisição de bens e serviços de produtor rural e produtor rural integrado não contribuinte, observado o art. 168 da Lei Complementar nº 214, de 2025.",
    label: "1 - Aquisição de bens e serviços de produtor rural e produtor rural integrado não contribuinte, observado o art. 168 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "2 - Aquisição de serviço de transportador autônomo de carga pessoa física não contribuinte, observado o art. 169 da Lei Complementar nº 214, de 2025.",
    label: "2 - Aquisição de serviço de transportador autônomo de carga pessoa física não contribuinte, observado o art. 169 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "3 - Aquisição de resíduos e demais materiais destinados à reciclagem, reutilização ou logística reversa adquiridos de pessoa física, cooperativa ou outra forma de organização popular, observado o art. 170 da Lei Complementar nº 214, de 2025.",
    label: "3 - Aquisição de resíduos e demais materiais destinados à reciclagem, reutilização ou logística reversa adquiridos de pessoa física, cooperativa ou outra forma de organização popular, observado o art. 170 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "4 - Aquisição de bens móveis usados de pessoa física não contribuinte para revenda, observado o art. 171 da Lei Complementar nº 214, de 2025.",
    label: "4 - Aquisição de bens móveis usados de pessoa física não contribuinte para revenda, observado o art. 171 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "5 - Regime automotivo, observado o art. 310 da Lei Complementar nº 214, de 2025.",
    label: "5 - Regime automotivo, observado o art. 310 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "6 - Regime automotivo, observado o art. 311 da Lei Complementar nº 214, de 2025.",
    label: "6 - Regime automotivo, observado o art. 311 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "7 - Aquisição por contribuinte na Zona Franca de Manaus, observado o art. 444 da Lei Complementar nº 214, de 2025.",
    label: "7 - Aquisição por contribuinte na Zona Franca de Manaus, observado o art. 444 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "8 - Aquisição por contribuinte na Zona Franca de Manaus, observado o art. 447 da Lei Complementar nº 214, de 2025.",
    label: "8 - Aquisição por contribuinte na Zona Franca de Manaus, observado o art. 447 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "9 - Aquisição por contribuinte na Zona Franca de Manaus, observado o art. 447 da Lei Complementar nº 214, de 2025.",
    label: "9 - Aquisição por contribuinte na Zona Franca de Manaus, observado o art. 447 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "10 - Aquisição por contribuinte na Zona Franca de Manaus, observado o art. 450 da Lei Complementar nº 214, de 2025.",
    label: "10 - Aquisição por contribuinte na Zona Franca de Manaus, observado o art. 450 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "11 - Aquisição por contribuinte na Área de Livre Comércio, observado o art. 462 da Lei Complementar nº 214, de 2025.",
    label: "11 - Aquisição por contribuinte na Área de Livre Comércio, observado o art. 462 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "12 - Aquisição por contribuinte na Área de Livre Comércio, observado o art. 465 da Lei Complementar nº 214, de 2025.",
    label: "12 - Aquisição por contribuinte na Área de Livre Comércio, observado o art. 465 da Lei Complementar nº 214, de 2025.",
  },
  {
    id: "13 - Aquisição pela indústria na Área de Livre Comércio, observado o art. 467 da Lei Complementar nº 214, de 2025.",
    label: "13 - Aquisição pela indústria na Área de Livre Comércio, observado o art. 467 da Lei Complementar nº 214, de 2025.",
  },
];

// Placeholder options — listas limpas sem duplicação de códigos
const NBS_OPTIONS: ComboboxOption[] = [
  { value: "1.0101.10.00", label: "Serviços profissionais" },
  { value: "1.0102.20.00", label: "Consultoria empresarial" },
  { value: "1.0103.30.00", label: "Tecnologia da informação" },
  { value: "1.0104.40.00", label: "Serviços de engenharia" },
  { value: "1.0105.50.00", label: "Serviços contábeis" },
];

const CNAE_OPTIONS: ComboboxOption[] = [
  { value: "6201-5/01", label: "Desenvolvimento de programas sob encomenda" },
  { value: "6202-3/00", label: "Desenvolvimento e licenciamento de software customizáveis" },
  { value: "6920-6/01", label: "Atividades de contabilidade" },
  { value: "7020-4/00", label: "Atividades de consultoria em gestão empresarial" },
  { value: "7112-0/00", label: "Serviços de engenharia" },
];

const COD_TRIB_MUNICIPIO_OPTIONS: ComboboxOption[] = [
  { value: "01.01", label: "Análise e desenvolvimento de sistemas" },
  { value: "01.05", label: "Licenciamento ou cessão de uso de programas" },
  { value: "07.01", label: "Engenharia, agronomia, arquitetura" },
  { value: "17.19", label: "Contabilidade, inclusive auditorias" },
];

const COD_ITEM_LISTA_OPTIONS: ComboboxOption[] = [
  { value: "1.01", label: "Análise e desenvolvimento de sistemas" },
  { value: "1.05", label: "Licenciamento de software" },
  { value: "7.01", label: "Engenharia" },
  { value: "17.19", label: "Contabilidade" },
];

const TIPO_TRIBUTACAO_OPTIONS = [
  { v: "1", t: "1 — Tributação no município" },
  { v: "2", t: "2 — Tributação fora do município" },
  { v: "3", t: "3 — Isenção" },
  { v: "4", t: "4 — Imune" },
  { v: "5", t: "5 — Exigibilidade suspensa por decisão judicial" },
  { v: "6", t: "6 — Exigibilidade suspensa por procedimento administrativo" },
  { v: "7", t: "7 — Não tributável" },
  { v: "8", t: "8 — Exportação" },
  { v: "9", t: "9 — Outro" },
];

const EXIGIBILIDADE_ISS_OPTIONS = [
  { v: "1", t: "1 — Exigível" },
  { v: "2", t: "2 — Não incidência" },
  { v: "3", t: "3 — Isenção" },
  { v: "4", t: "4 — Exportação" },
  { v: "5", t: "5 — Imunidade" },
  { v: "6", t: "6 — Suspensa por decisão judicial" },
  { v: "7", t: "7 — Suspensa por procedimento administrativo" },
];

const NATUREZA_RPS_OPTIONS = [
  { v: "1", t: "1 — Tributação no município" },
  { v: "2", t: "2 — Tributação fora do município" },
  { v: "3", t: "3 — Isenção" },
  { v: "4", t: "4 — Imune" },
  { v: "5", t: "5 — Exigibilidade suspensa por decisão judicial" },
  { v: "6", t: "6 — Exigibilidade suspensa por procedimento administrativo" },
];

const REGIME_ESPECIAL_OPTIONS = [
  { v: "1", t: "1 — Microempresa Municipal" },
  { v: "2", t: "2 — Estimativa" },
  { v: "3", t: "3 — Sociedade de profissionais" },
  { v: "4", t: "4 — Cooperativa" },
  { v: "5", t: "5 — MEI - Simples Nacional" },
  { v: "6", t: "6 — ME EPP - Simples Nacional" },
  { v: "7", t: "7 — Lucro Real" },
  { v: "8", t: "8 — Lucro Presumido" },
  { v: "9", t: "9 — Tributação Normal" },
  { v: "10", t: "10 — Simples Nacional - Excesso de sublimite" },
  { v: "11", t: "11 — Outros" },
];

const SITUACAO_TRIBUTARIA_OPTIONS = [
  { v: "0", t: "0 — TI (Tributação Integral)" },
  { v: "1", t: "1 — TIRF (Tributação Integral c/ Retenção na Fonte)" },
  { v: "2", t: "2 — TIST (Tributação Integral - Substituição Tributária)" },
  { v: "3", t: "3 — TRBC (Tributação Reduzida na Base de Cálculo)" },
  { v: "4", t: "4 — TRBCRF (Trib. Reduzida BC c/ Retenção na Fonte)" },
  { v: "5", t: "5 — TRBCST (Trib. Reduzida BC - Substituição Tributária)" },
  { v: "6", t: "6 — ISE (Isenção)" },
  { v: "7", t: "7 — IMU (Imunidade)" },
  { v: "8", t: "8 — NTIFIX (Não tributável - ISS fixo)" },
  { v: "9", t: "9 — NTIEs (Não tributável - Estimativa)" },
  { v: "10", t: "10 — NTICC (Não tributável - Cooperativas)" },
  { v: "15", t: "15 — NTAC (Não tributável - Atividade Cultural)" },
];

export function NfseForm({ form, update, onFinish, hideFinishButton, hideEmpresa }: Props) {
  const NFSE_TABS = hideEmpresa ? ALL_NFSE_TABS.filter((t) => t.key !== "empresa") : ALL_NFSE_TABS;
  const [creditoPresumidoOpen, setCreditoPresumidoOpen] = useState(false);
  function onCert(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    update("certificado_arquivo", { name: f.name, size: f.size });
  }
  const { loading: cnpjLoading, lookup } = useCnpjLookup((d) => {
    if (d.razao_social) update("razao_social", d.razao_social);
    const cnae = formatCnaeFromApi(d.cnae_fiscal);
    if (cnae) update("codigo_cnae", cnae);
    if (d.municipio && d.uf) update("municipio_prestacao", `${d.municipio} - ${d.uf}`);
  });

  const [dragOver, setDragOver] = useState(false);
  const anexoInputRef = useRef<HTMLInputElement>(null);
  const handleAnexo = useCallback(
    (files: FileList | null) => {
      const f = files?.[0];
      if (!f) return;
      if (!/\.(xml|txt)$/i.test(f.name)) {
        toast.error("Formato inválido. Envie um arquivo .xml ou .txt");
        return;
      }
      update("anexo_contabilidade", { name: f.name, size: f.size });
      const atual = parseInt((form.numero_nota ?? "").replace(/\D/g, ""), 10);
      if (!Number.isNaN(atual)) update("numero_nota", String(atual + 1));
      toast.success("Arquivo anexado. Confirme o próximo número sequencial.");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.numero_nota],
  );
  function removeAnexo() {
    update("anexo_contabilidade", undefined as any);
    if (anexoInputRef.current) anexoInputRef.current.value = "";
  }

  const selectedCreditoCount = form.credito_presumido_cbs_ibs?.length ?? 0;

  return (
    <TooltipProvider delayDuration={150}>
    <div className="bg-card border rounded-2xl p-4 md:p-6 shadow-sm space-y-6 w-full min-w-0 max-w-full overflow-hidden">
      <section className="space-y-4 min-w-0 w-full">
        <div className="flex items-center gap-2">
          <FileUp className="h-4 w-4 text-primary shrink-0" />
          <h3 className="font-semibold text-sm">Arquivo da Contabilidade</h3>
        </div>
        {!form.anexo_contabilidade ? (
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleAnexo(e.dataTransfer.files); }}
            className={cn(
              "flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition w-full min-w-0",
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:bg-muted/40",
            )}
          >
            <Upload className="h-7 w-7 text-primary" />
            <p className="text-sm font-medium text-center break-words max-w-full px-2">
              Arraste e solte o arquivo aqui, ou{" "}
              <span className="text-primary underline">clique para selecionar</span>
            </p>
            <p className="text-xs text-muted-foreground">Formatos aceitos: .XML ou .TXT</p>
            <input
              ref={anexoInputRef}
              type="file"
              accept=".xml,.txt"
              className="hidden"
              onChange={(e) => handleAnexo(e.target.files)}
            />
          </label>
        ) : (
          <div className="flex items-center gap-3 border rounded-xl p-3 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 min-w-0 w-full">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{form.anexo_contabilidade.name}</p>
              <p className="text-xs text-muted-foreground">
                {Math.round(form.anexo_contabilidade.size / 1024)} KB
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={removeAnexo} className="gap-1 shrink-0">
              <X className="h-4 w-4" /> Remover
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-4 min-w-0 w-full">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <h3 className="font-semibold text-sm">Informações de Identificação da NFS-e</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 min-w-0 w-full">
          <LabeledField label="Número da Nota">
            <Input
              inputMode="numeric"
              value={form.numero_nota ?? ""}
              onChange={(e) => update("numero_nota", e.target.value.replace(/\D/g, ""))}
              placeholder="Ex.: 000123"
            />
          </LabeledField>
          <LabeledField label="Número de Série">
            <Input
              inputMode="numeric"
              value={form.numero_serie ?? ""}
              onChange={(e) => update("numero_serie", e.target.value.replace(/\D/g, ""))}
              placeholder="Ex.: 1"
            />
          </LabeledField>
          <LabeledField
            label="Número do RPS (Ambiente Municipal)"
            tooltip="Recibo Provisório de Serviços: Utilize para informar a numeração de contingência utilizada especificamente no padrão do sistema municipal da sua prefeitura."
          >
            <Input
              inputMode="numeric"
              value={form.numero_rps ?? ""}
              onChange={(e) => update("numero_rps", e.target.value.replace(/\D/g, ""))}
              placeholder="Ex.: 000001"
            />
          </LabeledField>
          <LabeledField
            label="Número da DP / DPS (Ambiente Nacional)"
            tooltip="Declaração de Prestação de Serviços: Utilize para informar a numeração padrão do ambiente nacional da Nota Fiscal de Serviço eletrônica (padrão unificado da Reforma Tributária)."
          >
            <Input
              inputMode="numeric"
              value={form.numero_dps ?? ""}
              onChange={(e) => update("numero_dps", e.target.value.replace(/\D/g, ""))}
              placeholder="Ex.: 000001"
            />
          </LabeledField>
        </div>
      </section>

      <Tabs defaultValue={NFSE_TABS[0].key} className="w-full min-w-0">

        <TabsList className="flex flex-wrap md:flex-nowrap overflow-x-auto gap-1.5 bg-muted/80 p-1.5 rounded-xl w-full justify-start items-center max-w-full">
          {NFSE_TABS.map((t, i) => (
            <TabsTrigger
              key={t.key}
              value={t.key}
              className="px-3.5 py-2 text-xs md:text-sm font-medium rounded-lg shrink-0 whitespace-nowrap transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:font-semibold"
            >
              <span className="font-mono mr-1.5 opacity-60">{i + 1}</span>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ABA 1 — Empresa & Prefeitura (oculta quando há cadastro global) */}
        {!hideEmpresa && (
          <TabsContent value="empresa" className="pt-5 space-y-6 min-w-0 w-full">
            <Section title="Empresa">
              <div className="grid gap-4 md:grid-cols-2 min-w-0 w-full">
                <Field label="Razão Social" className="md:col-span-2">
                  <Input value={form.razao_social ?? ""} onChange={(e) => update("razao_social", e.target.value)} placeholder="Empresa LTDA" />
                </Field>
                <Field label="CNPJ / CPF">
                  <CnpjInput
                    value={form.cnpj_cpf ?? ""}
                    onChange={(e) => {
                      update("cnpj_cpf", e.target.value);
                      const digits = e.target.value.replace(/\D/g, "");
                      if (digits.length === 14) lookup(digits);
                    }}
                    onLookup={(v) => lookup(v, true)}
                    loading={cnpjLoading}
                    placeholder="00.000.000/0000-00"
                  />
                </Field>
                <Field label="Regime Tributário">
                  <SelectField
                    options={[
                      { v: "simples", t: "Simples Nacional" },
                      { v: "mei", t: "MEI - Microempreendedor Individual" },
                      { v: "normal", t: "Regime Normal (Lucro Real / Presumido)" },
                    ]}
                    value={form.regime}
                    onChange={(v) => update("regime", v)}
                  />
                </Field>
                <Field label="Inscrição Estadual">
                  <Input value={form.inscricao_estadual ?? ""} onChange={(e) => update("inscricao_estadual", e.target.value)} placeholder="Isento ou número" />
                </Field>
                <Field label="Inscrição Municipal">
                  <Input value={form.inscricao_municipal ?? ""} onChange={(e) => update("inscricao_municipal", e.target.value)} placeholder="Isento ou número" />
                </Field>
              </div>
            </Section>

            <Section title="Certificado Digital">
              <div className="grid gap-4 md:grid-cols-2 min-w-0 w-full">
                <Field label="Certificado Digital PJ A1" className="md:col-span-2">
                  <label className="flex items-center gap-3 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-muted/40 transition min-w-0 w-full">
                    <Upload className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm flex-1 truncate">
                      {form.certificado_arquivo?.name ?? "Anexar arquivo .pfx / .p12"}
                    </span>
                    {form.certificado_arquivo && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {Math.round(form.certificado_arquivo.size / 1024)} KB
                      </span>
                    )}
                    <input type="file" accept=".pfx,.p12" className="hidden" onChange={onCert} />
                  </label>
                </Field>
                <Field label="Senha do Certificado">
                  <Input type="password" value={form.certificado_senha ?? ""} onChange={(e) => update("certificado_senha", e.target.value)} placeholder="••••••••" />
                </Field>
              </div>
            </Section>

            <Section title="Credenciais da Prefeitura">
              <div className="grid gap-4 md:grid-cols-2 min-w-0 w-full">
                <Field label="Login Acesso à Prefeitura">
                  <Input value={form.prefeitura_login ?? ""} onChange={(e) => update("prefeitura_login", e.target.value)} placeholder="Usuário do portal" />
                </Field>
                <Field label="Senha Acesso à Prefeitura">
                  <Input type="password" value={form.prefeitura_senha ?? ""} onChange={(e) => update("prefeitura_senha", e.target.value)} placeholder="••••••••" />
                </Field>
              </div>
            </Section>
          </TabsContent>
        )}

        {/* ABA — Reforma Tributária (CBS / IBS / LC 214/2025) */}
        <TabsContent value="reforma" className="pt-5 space-y-6 min-w-0 w-full">
          <Section title="Reforma Tributária (CBS / IBS / LC 214/2025) da NFS-e">
            <p className="text-xs text-muted-foreground mb-4 break-words leading-relaxed">
              Campos oficiais de parametrização da NFS-e conforme a Lei Complementar nº 214/2025 e o padrão nacional de tributação sobre o consumo (CBS / IBS).
            </p>

            <div className="space-y-4 min-w-0 w-full">
              <div className="grid gap-4 md:grid-cols-2 min-w-0 w-full">
                <Field label="CBS/IBS NFSe *" className="w-full">
                  <Combobox
                    options={CBS_IBS_NFSE_OPTIONS}
                    value={form.cbs_ibs_nfse}
                    onChange={(v) => update("cbs_ibs_nfse", v)}
                    placeholder="Selecione ou digite o enquadramento CBS/IBS..."
                  />
                </Field>

                <Field label="Classificação Tributária (cClassTrib)" className="w-full">
                  <Combobox
                    options={C_CLASS_TRIB_OPTIONS}
                    value={form.c_class_trib}
                    onChange={(v) => update("c_class_trib", v)}
                    placeholder="Selecione ou busque o código cClassTrib..."
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2 min-w-0 w-full">
                <PercentField
                  label="Alíquota CBS"
                  value={form.aliquota_cbs}
                  onChange={(v) => update("aliquota_cbs", v)}
                />
                <PercentField
                  label="Alíquota IBS UF *"
                  value={form.aliquota_ibs_uf}
                  onChange={(v) => update("aliquota_ibs_uf", v)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2 min-w-0 w-full">
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
              <div className="rounded-xl border bg-card shadow-xs overflow-hidden transition-all duration-200 min-w-0 w-full">
                <button
                  type="button"
                  onClick={() => setCreditoPresumidoOpen(!creditoPresumidoOpen)}
                  className="w-full flex items-center justify-between p-3.5 md:p-4 text-left bg-muted/20 hover:bg-muted/40 transition cursor-pointer select-none min-w-0 gap-3"
                  aria-expanded={creditoPresumidoOpen}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Scale className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs md:text-sm font-semibold text-foreground break-words">
                          Crédito Presumido (CBS / IBS) — LC 214/2025
                        </span>
                        {selectedCreditoCount > 0 ? (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                            {selectedCreditoCount} selecionada(s)
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full border">
                            Opcional • 13 hipóteses
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {creditoPresumidoOpen
                          ? "Clique para recolher o quadro de opções"
                          : "Clique para expandir e selecionar hipóteses de crédito presumido"}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center justify-center h-7 w-7 rounded-md bg-muted/60 text-muted-foreground">
                    {creditoPresumidoOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {creditoPresumidoOpen && (
                  <div className="p-3 md:p-4 border-t bg-muted/5 space-y-2.5 min-w-0 w-full">
                    <div className="flex items-center justify-between pb-1 border-b border-border/50 gap-2">
                      <span className="text-xs text-muted-foreground">
                        Marque as hipóteses aplicáveis à operação:
                      </span>
                      {selectedCreditoCount > 0 && (
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

                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 min-w-0 w-full">
                      {CREDITO_PRESUMIDO_LC214_OPTIONS.map((opt) => {
                        const current = Array.isArray(form.credito_presumido_cbs_ibs) ? form.credito_presumido_cbs_ibs : [];
                        const isChecked = current.includes(opt.id);
                        return (
                          <div
                            key={opt.id}
                            className={cn(
                              "flex items-start gap-3 p-2.5 rounded-lg border transition cursor-pointer min-w-0 w-full",
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

              <div className="grid gap-4 md:grid-cols-2 pt-2 min-w-0 w-full">
                <PercentField
                  label="Percentual Crédito Presumido CBS"
                  value={form.percentual_credito_presumido_cbs}
                  onChange={(v) => update("percentual_credito_presumido_cbs", v)}
                />
                <PercentField
                  label="Percentual Crédito Presumido IBS"
                  value={form.percentual_credito_presumido_ibs}
                  onChange={(v) => update("percentual_credito_presumido_ibs", v)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2 pt-2 min-w-0 w-full">
                <Field label="Código de Tributação do Município *">
                  <Combobox
                    options={COD_TRIB_MUNICIPIO_OPTIONS}
                    value={form.codigo_tributacao_municipio}
                    onChange={(v) => update("codigo_tributacao_municipio", v)}
                    placeholder="Selecione ou digite o código municipal..."
                  />
                </Field>
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
        </TabsContent>

        {/* ABA 2 */}
        <TabsContent value="codigos" className="pt-5 space-y-6 min-w-0 w-full">
          {hideEmpresa && (
            <Section title="Credenciais da Prefeitura">
              <div className="grid gap-4 md:grid-cols-2 min-w-0 w-full">
                <Field label="Login Acesso à Prefeitura">
                  <Input value={form.prefeitura_login ?? ""} onChange={(e) => update("prefeitura_login", e.target.value)} placeholder="Usuário do portal" />
                </Field>
                <Field label="Senha Acesso à Prefeitura">
                  <Input type="password" value={form.prefeitura_senha ?? ""} onChange={(e) => update("prefeitura_senha", e.target.value)} placeholder="••••••••" />
                </Field>
              </div>
            </Section>
          )}
          <Section title="RPS (Recibo Provisório de Serviços)">
            <div className="grid gap-4 md:grid-cols-2 min-w-0 w-full">
              <Field label="Último RPS emitido">
                <Input inputMode="numeric" value={form.ultimo_rps ?? ""} onChange={(e) => update("ultimo_rps", e.target.value.replace(/\D/g, ""))} placeholder="0" />
              </Field>
              <Field label="Série do último RPS">
                <Input value={form.serie_rps ?? ""} onChange={(e) => update("serie_rps", e.target.value)} placeholder="1" />
              </Field>
            </div>
          </Section>

          <Section title="Códigos e Classificação de Serviços">
            <p className="text-xs text-muted-foreground mb-3 break-words leading-relaxed">
              Não encontrou o código na lista? Digite o código desejado no campo de busca e selecione a opção
              “Usar &lt;código&gt;” — qualquer código válido pode ser informado manualmente.
            </p>
            <div className="grid gap-4 md:grid-cols-2 min-w-0 w-full">
              <Field label="Código NBS">
                <Combobox options={NBS_OPTIONS} value={form.codigo_nbs} onChange={(v) => update("codigo_nbs", v)} />
              </Field>
              <Field label="Código CNAE">
                <Combobox options={CNAE_OPTIONS} value={form.codigo_cnae} onChange={(v) => update("codigo_cnae", v)} />
              </Field>
              <Field label="Código do Item da Lista de Serviço">
                <Combobox options={COD_ITEM_LISTA_OPTIONS} value={form.codigo_item_lista_servico} onChange={(v) => update("codigo_item_lista_servico", v)} />
              </Field>
              <Field label="Município de Prestação">
                <Input value={form.municipio_prestacao ?? ""} onChange={(e) => update("municipio_prestacao", e.target.value)} placeholder="Ex.: São Paulo - SP" />
              </Field>
              <Field label="Código Contribuinte">
                <Input value={form.codigo_contribuinte ?? ""} onChange={(e) => update("codigo_contribuinte", e.target.value)} placeholder="Código municipal do contribuinte" />
              </Field>
              <Field label="Código do Item (Livre — 6 dígitos)">
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={form.codigo_item_livre ?? ""}
                  onChange={(e) => update("codigo_item_livre", e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                />
              </Field>
              <Field label="CFOP de Entrada / Aquisição de Serviço">
                <Combobox
                  options={CFOP_OPTIONS.filter((o) => o.value.startsWith("1") || o.value.startsWith("2"))}
                  value={form.cfop_entrada}
                  onChange={(v) => update("cfop_entrada", v)}
                  placeholder="Ex.: 1933 / 2933 - Aquisição de serviço tributado pelo ISSQN"
                />
              </Field>
              <Field label="CFOP de Prestação de Serviço (Saída)">
                <Combobox
                  options={CFOP_OPTIONS.filter((o) => o.value.startsWith("5") || o.value.startsWith("6"))}
                  value={form.codigo_cfop}
                  onChange={(v) => update("codigo_cfop", v)}
                  placeholder="Ex.: 5933 - Prestação de serviço tributado pelo ISSQN"
                />
              </Field>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 mt-4 gap-3 min-w-0 w-full">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium break-words">Incentivador Cultural</p>
                <p className="text-xs text-muted-foreground break-words">Empresa beneficiária de incentivos culturais municipais.</p>
              </div>
              <Switch
                checked={!!form.incentivador_cultural}
                onCheckedChange={(v) => update("incentivador_cultural", v)}
                className="shrink-0"
              />
            </div>
          </Section>
        </TabsContent>

        {/* ABA 3 */}
        <TabsContent value="aliquotas" className="pt-5 space-y-6 min-w-0 w-full">
          <Section title="ISS — Imposto Sobre Serviços">
            <div className="grid gap-4 md:grid-cols-3 min-w-0 w-full">
              <PercentField label="Alíquota ISS" value={form.aliquota_iss} onChange={(v) => update("aliquota_iss", v)} />
            </div>
          </Section>

          <Section title="Valor Aproximado dos Tributos (Lei da Transparência / IBPT)">
            <p className="text-xs text-muted-foreground mb-3 break-words leading-relaxed">
              Percentuais aproximados informados no rodapé da NFS-e para atendimento à Lei nº 12.741/2012.
            </p>
            <div className="grid gap-4 md:grid-cols-3 min-w-0 w-full">
              <PercentField label="Tributos Nacional" value={form.aprox_tributos_nacional} onChange={(v) => update("aprox_tributos_nacional", v)} />
              <PercentField label="Tributos Estadual" value={form.aprox_tributos_estadual} onChange={(v) => update("aprox_tributos_estadual", v)} />
              <PercentField label="Tributos Municipal" value={form.aprox_tributos_municipal} onChange={(v) => update("aprox_tributos_municipal", v)} />
            </div>
          </Section>
        </TabsContent>

        {/* ABA 4 */}
        <TabsContent value="enquadramento" className="pt-5 space-y-6 min-w-0 w-full">
          <Section title="Regime Tributário da Empresa">
            <p className="text-xs text-muted-foreground mb-3 break-words leading-relaxed">
              Informe o regime tributário federal adotado pela empresa prestadora de serviços.
            </p>
            <div className="grid gap-3 md:grid-cols-3 min-w-0 w-full mb-6">
              {[
                { v: "simples", t: "Simples Nacional", d: "ME / EPP — recolhimento unificado via DAS." },
                { v: "mei", t: "MEI", d: "Microempreendedor Individual — NFS-e padrão nacional." },
                { v: "normal", t: "Regime Normal", d: "Lucro Presumido ou Lucro Real — apuração regular." },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => update("regime", opt.v)}
                  className={cn(
                    "text-left rounded-xl border-2 p-4 transition-all hover:border-primary/40 cursor-pointer min-w-0 w-full",
                    form.regime === opt.v
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border bg-card",
                  )}
                >
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="font-semibold text-sm">{opt.t}</span>
                    {form.regime === opt.v && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{opt.d}</p>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Regime & Tributação Municipal">
            <p className="text-xs text-muted-foreground mb-3 break-words leading-relaxed">
              Configure as regras municipais do ISS e o regime adotado perante a prefeitura.
            </p>
            <div className="grid gap-4 md:grid-cols-2 min-w-0 w-full">
              <Field label="Tipo de Tributação">
                <SelectField options={TIPO_TRIBUTACAO_OPTIONS} value={form.tipo_tributacao} onChange={(v) => update("tipo_tributacao", v)} />
              </Field>
              <Field label="Exigibilidade do ISS">
                <SelectField options={EXIGIBILIDADE_ISS_OPTIONS} value={form.exigibilidade_iss} onChange={(v) => update("exigibilidade_iss", v)} />
              </Field>
              <Field label="Regime Especial de Tributação (RPS)">
                <SelectField options={REGIME_ESPECIAL_OPTIONS} value={form.regime_especial_rps} onChange={(v) => update("regime_especial_rps", v)} />
              </Field>
              <Field label="Natureza da Tributação (RPS)">
                <SelectField options={NATUREZA_RPS_OPTIONS} value={form.natureza_tributacao_rps} onChange={(v) => update("natureza_tributacao_rps", v)} />
              </Field>
            </div>
          </Section>

          <Section title="Situação Tributária do ISS">
            <Field label="CST / Situação Tributária Municipal" className="w-full min-w-0">
              <SelectField options={SITUACAO_TRIBUTARIA_OPTIONS} value={form.situacao_tributaria} onChange={(v) => update("situacao_tributaria", v)} />
            </Field>
          </Section>
        </TabsContent>

        {/* ABA 5 */}
        <TabsContent value="final" className="pt-5 space-y-6 min-w-0 w-full">
          <Section title="Considerações Finais">
            <Textarea
              value={form.observacoes ?? ""}
              onChange={(e) => update("observacoes", e.target.value)}
              rows={8}
              placeholder="Particularidades do município, regras de retenção, observações para a equipe Certifica+..."
              className="w-full min-w-0"
            />
          </Section>
          {!hideFinishButton && (
            <div className="flex justify-end fixed bottom-0 left-0 right-0 z-40 p-4 bg-background border-t shadow-lg md:static md:p-0 md:bg-transparent md:border-0 md:shadow-none">
              <Button onClick={onFinish} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Check className="h-4 w-4" /> Salvar e Enviar Parametrização
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </TooltipProvider>
  );
}

/* ----------------- Primitives ------------------ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 min-w-0 w-full">
      <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
        <FileText className="h-4 w-4 text-primary shrink-0" />
        <span className="truncate">{title}</span>
      </h3>
      {children}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5 min-w-0 w-full", className)}>
      {label && (
        <Label className="text-xs uppercase tracking-wide text-muted-foreground block break-words whitespace-normal leading-normal">
          {label}
        </Label>
      )}
      {children}
    </div>
  );
}

function PercentField({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <Field label={label} className="min-w-0 w-full">
      <div className="relative min-w-0 w-full">
        <Input
          inputMode="decimal"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, "").replace(",", "."))}
          placeholder="0,00"
          className="pr-8 w-full"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
      </div>
    </Field>
  );
}

function SelectField({
  options,
  value,
  onChange,
}: {
  options: { v: string; t: string }[];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full min-w-0">
        <SelectValue placeholder="Selecione..." />
      </SelectTrigger>
      <SelectContent className="max-w-[90vw] md:max-w-md">
        {options.map((o) => (
          <SelectItem key={o.v} value={o.v} className="text-xs md:text-sm">
            {o.t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function LabeledField({
  label,
  tooltip,
  children,
}: {
  label: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 min-w-0 w-full">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-start gap-1.5 break-words whitespace-normal leading-normal">
        <span className="flex-1 min-w-0">{label}</span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center text-muted-foreground hover:text-primary transition shrink-0 mt-0.5"
                aria-label="Mais informações"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed z-50">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </Label>
      {children}
    </div>
  );
}
