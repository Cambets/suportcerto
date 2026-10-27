import { useState } from "react";
import { Check, FileText, Upload, Truck, Scale, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  CFOP_OPTIONS,
  CST_ICMS_OPTIONS,
  IND_IE_DEST_OPTIONS,
  CST_CBS_IBS_OPTIONS,
  C_CLASS_TRIB_OPTIONS,
  CREDITO_PRESUMIDO_LC214_OPTIONS,
} from "@/lib/fiscal-options";
import { CnpjInput } from "@/components/parametrizacao/cnpj-input";
import { useCnpjLookup } from "@/hooks/use-cnpj-lookup";

export type CteData = {
  // Aba 1 — Empresa e Certificado
  razao_social?: string;
  cnpj_cpf?: string;
  certificado_arquivo?: { name: string; size: number };
  certificado_senha?: string;
  ultimo_cte?: string;
  serie_cte?: string;
  chaves_referenciadas?: string;

  // Aba — Reforma Tributária (CBS / IBS / LC 214/2025)
  cst_cbs?: string;
  c_class_trib?: string;
  aliquota_cbs?: string;
  aliquota_ibs_uf?: string;
  diferimento_ibs?: string;
  reducao_ibs?: string;
  credito_presumido_cbs_ibs?: string[];
  percentual_credito_presumido_cbs?: string;
  percentual_credito_presumido_ibs?: string;
  codigo_indicador_operacao_fornecimento?: string;

  // Aba 2 — Veículo
  placa?: string;
  renavam?: string;
  rntrc?: string;
  uf_placa?: string;
  tipo_rodado?: string;
  tipo_carroceria?: string;

  // Aba 3 — Propriedade
  tipo_propriedade?: "proprio" | "terceiros" | "outro";
  proprietario_dados?: string;
  proprietario_endereco?: string;
  tipo_veiculo?: "tracao" | "reboque" | "outro";

  // Aba 4 — Tributação (Contribuinte & Não Contribuinte)
  regime_tributario?: "simples" | "mei" | "normal";
  indicador_tomador?: string;
  cfop?: string;
  cfop_nao_contrib?: string;
  cfop_entrada?: string;
  cst?: string;
  cst_nao_contrib?: string;
  aliquota?: string;
  aliquota_nao_contrib?: string;
  reducao_bc?: string;
  usa_difal?: boolean;
  aliquota_difal?: string;
  observacoes?: string;
};

const ALL_CTE_TABS = [
  { key: "empresa", label: "Empresa & Certificado" },
  { key: "numeracao", label: "Numeração CT-e" },
  { key: "reforma", label: "Reforma Tributária (CBS/IBS)" },
  { key: "veiculo", label: "Veículo" },
  { key: "propriedade", label: "Propriedade & Tipo" },
  { key: "tributacao", label: "Tributação ICMS" },
] as const;

const RODADOS = ["Truck", "Toco", "Cavalo Mecânico", "Van", "Utilitário", "Outros"];
const CARROCERIAS = [
  "Não aplicável",
  "Aberta",
  "Fechada/Baú",
  "Graneleira",
  "Porta-Contêiner",
  "Sider",
  "Outro",
];
const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

type Props = {
  form: CteData;
  update: <K extends keyof CteData>(key: K, value: CteData[K]) => void;
  onFinish: () => void;
  showFinishButton?: boolean;
  hideEmpresa?: boolean;
};

export function CteForm({ form, update, onFinish, showFinishButton = true, hideEmpresa }: Props) {
  const CTE_TABS = hideEmpresa ? ALL_CTE_TABS.filter((t) => t.key !== "empresa") : ALL_CTE_TABS;
  const [creditoOpen, setCreditoOpen] = useState(false);
  const selectedCount = form.credito_presumido_cbs_ibs?.length ?? 0;

  function onCert(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    update("certificado_arquivo", { name: f.name, size: f.size });
  }
  const { loading: cnpjLoading, lookup } = useCnpjLookup((d) => {
    if (d.razao_social) update("razao_social", d.razao_social);
  });

  return (
    <div className="bg-card border rounded-2xl p-4 md:p-6 shadow-sm w-full min-w-0 max-w-full overflow-hidden">
      <Tabs defaultValue={CTE_TABS[0].key} className="w-full min-w-0">
        <TabsList className="flex flex-wrap md:flex-nowrap overflow-x-auto gap-1.5 bg-muted/80 p-1.5 rounded-xl w-full justify-start items-center max-w-full">
          {CTE_TABS.map((t, i) => (
            <TabsTrigger
              key={t.key}
              value={t.key}
              className="px-3.5 py-2 text-xs md:text-sm font-medium rounded-lg shrink-0 whitespace-nowrap transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:font-semibold"
            >
              <span className="font-mono mr-1.5 opacity-60">{i + 1}</span>
              {t.label}
            </TabsTrigger>
          ))}
          <TabsTrigger
            value="final"
            className="px-3.5 py-2 text-xs md:text-sm font-medium rounded-lg shrink-0 whitespace-nowrap transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:font-semibold"
          >
            <span className="font-mono mr-1.5 opacity-60">{CTE_TABS.length + 1}</span>
            Final
          </TabsTrigger>
        </TabsList>

        {/* ABA 1 */}
        {!hideEmpresa && (
        <TabsContent value="empresa" className="pt-5">
          <Section title="Empresa e Certificado">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Razão Social" className="md:col-span-2">
                <Input value={form.razao_social ?? ""} onChange={(e) => update("razao_social", e.target.value)} placeholder="Transportadora LTDA" />
              </Field>
              <Field label="CNPJ / CPF">
                <CnpjInput value={form.cnpj_cpf ?? ""} onChange={(e) => update("cnpj_cpf", e.target.value)} onLookup={lookup} loading={cnpjLoading} placeholder="00.000.000/0000-00" />
              </Field>
              <Field label="Certificado Digital PJ A1" className="md:col-span-2">
                <label className="flex items-center gap-3 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-muted/40 transition">
                  <Upload className="h-4 w-4 text-primary" />
                  <span className="text-sm flex-1 truncate">
                    {form.certificado_arquivo?.name ?? "Anexar arquivo .pfx / .p12"}
                  </span>
                  {form.certificado_arquivo && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(form.certificado_arquivo.size / 1024)} KB
                    </span>
                  )}
                  <input type="file" accept=".pfx,.p12" className="hidden" onChange={onCert} />
                </label>
              </Field>
              <Field label="Senha do Certificado">
                <Input type="password" value={form.certificado_senha ?? ""} onChange={(e) => update("certificado_senha", e.target.value)} placeholder="••••••••" />
              </Field>
              <div />
              <Field label="Número do último CT-e emitido">
                <Input inputMode="numeric" value={form.ultimo_cte ?? ""} onChange={(e) => update("ultimo_cte", e.target.value.replace(/\D/g, ""))} placeholder="0" />
              </Field>
              <Field label="Série do último CT-e">
                <Input inputMode="numeric" value={form.serie_cte ?? ""} onChange={(e) => update("serie_cte", e.target.value.replace(/\D/g, ""))} placeholder="1" />
              </Field>
            </div>
          </Section>
        </TabsContent>
        )}

        {/* ABA — Numeração & Últimos Documentos */}
        <TabsContent value="numeracao" className="pt-5 space-y-6">
          <Section title="Numeração e Últimos Documentos Emitidos (CT-e)">
            <p className="text-xs text-muted-foreground mb-4 break-words leading-relaxed">
              Informe o número e a série do último Conhecimento de Transporte emitido, além das chaves de acesso dos últimos documentos fiscais (CT-e / NF-e) para dar continuidade à emissão fiscal.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Número do último CT-e emitido">
                <Input
                  inputMode="numeric"
                  value={form.ultimo_cte ?? ""}
                  onChange={(e) => update("ultimo_cte", e.target.value.replace(/\D/g, ""))}
                  placeholder="Ex.: 1540"
                />
                <span className="text-[11px] text-muted-foreground">
                  Último número de CT-e emitido ou autorizado na SEFAZ.
                </span>
              </Field>
              <Field label="Série do CT-e">
                <Input
                  inputMode="numeric"
                  value={form.serie_cte ?? ""}
                  onChange={(e) => update("serie_cte", e.target.value.replace(/\D/g, ""))}
                  placeholder="Ex.: 1"
                />
                <span className="text-[11px] text-muted-foreground">
                  Série do documento (padrão 1).
                </span>
              </Field>
            </div>

            <Field label="Chaves de acesso de NF-e ou CT-e referenciadas (Últimos Documentos)">
              <Textarea
                rows={4}
                value={form.chaves_referenciadas ?? ""}
                onChange={(e) => update("chaves_referenciadas", e.target.value)}
                placeholder="Cole as chaves de 44 dígitos dos últimos documentos fiscais autorizados, uma por linha."
              />
              <span className="text-[11px] text-muted-foreground">
                Utilizado para referência ou validação do fluxo operacional de transporte.
              </span>
            </Field>
          </Section>
        </TabsContent>

        {/* ABA — Reforma Tributária (CBS / IBS / LC 214/2025) */}
        <TabsContent value="reforma" className="pt-5 space-y-6">
          <Section title="Reforma Tributária (CBS / IBS / LC 214/2025) do CT-e">
            <p className="text-xs text-muted-foreground mb-4 break-words leading-relaxed">
              Campos oficiais de parametrização do Conhecimento de Transporte conforme a Lei Complementar nº 214/2025 e o padrão nacional de tributação sobre o consumo (CBS / IBS).
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

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Alíquota CBS (%)">
                  <div className="relative">
                    <Input
                      inputMode="decimal"
                      value={form.aliquota_cbs ?? ""}
                      onChange={(e) => update("aliquota_cbs", e.target.value.replace(/[^\d.,]/g, "").replace(",", "."))}
                      placeholder="0,00"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </Field>
                <Field label="Alíquota IBS UF (%) *">
                  <div className="relative">
                    <Input
                      inputMode="decimal"
                      value={form.aliquota_ibs_uf ?? ""}
                      onChange={(e) => update("aliquota_ibs_uf", e.target.value.replace(/[^\d.,]/g, "").replace(",", "."))}
                      placeholder="0,00"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Diferimento IBS (%)">
                  <div className="relative">
                    <Input
                      inputMode="decimal"
                      value={form.diferimento_ibs ?? ""}
                      onChange={(e) => update("diferimento_ibs", e.target.value.replace(/[^\d.,]/g, "").replace(",", "."))}
                      placeholder="0,00"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </Field>
                <Field label="Redução IBS (%) *">
                  <div className="relative">
                    <Input
                      inputMode="decimal"
                      value={form.reducao_ibs ?? ""}
                      onChange={(e) => update("reducao_ibs", e.target.value.replace(/[^\d.,]/g, "").replace(",", "."))}
                      placeholder="0,00"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </Field>
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
                        Marque as hipóteses aplicáveis à prestação de transporte:
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
                <Field label="Percentual Crédito Presumido CBS (%)">
                  <div className="relative">
                    <Input
                      inputMode="decimal"
                      value={form.percentual_credito_presumido_cbs ?? ""}
                      onChange={(e) => update("percentual_credito_presumido_cbs", e.target.value.replace(/[^\d.,]/g, "").replace(",", "."))}
                      placeholder="0,00"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </Field>
                <Field label="Percentual Crédito Presumido IBS (%)">
                  <div className="relative">
                    <Input
                      inputMode="decimal"
                      value={form.percentual_credito_presumido_ibs ?? ""}
                      onChange={(e) => update("percentual_credito_presumido_ibs", e.target.value.replace(/[^\d.,]/g, "").replace(",", "."))}
                      placeholder="0,00"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </Field>
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
        </TabsContent>

        {/* ABA 2 */}
        <TabsContent value="veiculo" className="pt-5 space-y-6">
          <Section title="Dados do Veículo">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Placa do Veículo">
                <Input value={form.placa ?? ""} onChange={(e) => update("placa", e.target.value.toUpperCase())} placeholder="ABC-1D23" />
              </Field>
              <Field label="Renavam">
                <Input value={form.renavam ?? ""} onChange={(e) => update("renavam", e.target.value.replace(/\D/g, ""))} placeholder="00000000000" />
              </Field>
              <Field label="RNTRC (ou ANTT)">
                <Input value={form.rntrc ?? ""} onChange={(e) => update("rntrc", e.target.value)} placeholder="00000000" />
              </Field>
              <Field label="UF da Placa">
                <select
                  value={form.uf_placa ?? ""}
                  onChange={(e) => update("uf_placa", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">Selecione...</option>
                  {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Tipo de Rodado">
            <CardGroup
              options={RODADOS}
              value={form.tipo_rodado}
              onChange={(v) => update("tipo_rodado", v)}
            />
          </Section>

          <Section title="Tipo de Carroceria">
            <CardGroup
              options={CARROCERIAS}
              value={form.tipo_carroceria}
              onChange={(v) => update("tipo_carroceria", v)}
            />
          </Section>
        </TabsContent>

        {/* ABA 3 */}
        <TabsContent value="propriedade" className="pt-5 space-y-6">
          <Section title="Tipo de Propriedade">
            <CardGroup
              options={[
                { v: "proprio", t: "Próprio" },
                { v: "terceiros", t: "Terceiros" },
                { v: "outro", t: "Outro" },
              ]}
              value={form.tipo_propriedade}
              onChange={(v) => update("tipo_propriedade", v as CteData["tipo_propriedade"])}
            />
            {form.tipo_propriedade === "terceiros" && (
              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <Field label="Dados do Proprietário (Nome + CPF/CNPJ)" className="md:col-span-2">
                  <Input
                    value={form.proprietario_dados ?? ""}
                    onChange={(e) => update("proprietario_dados", e.target.value)}
                    placeholder="Nome completo + CPF/CNPJ"
                  />
                </Field>
                <Field label="Endereço Completo do Proprietário" className="md:col-span-2">
                  <Input
                    value={form.proprietario_endereco ?? ""}
                    onChange={(e) => update("proprietario_endereco", e.target.value)}
                    placeholder="Rua, número, bairro, cidade/UF, CEP"
                  />
                </Field>
              </div>
            )}
          </Section>

          <Section title="Tipo de Veículo">
            <CardGroup
              options={[
                { v: "tracao", t: "Tração" },
                { v: "reboque", t: "Reboque" },
                { v: "outro", t: "Outro" },
              ]}
              value={form.tipo_veiculo}
              onChange={(v) => update("tipo_veiculo", v as CteData["tipo_veiculo"])}
            />
          </Section>
        </TabsContent>

        {/* ABA 4 */}
        <TabsContent value="tributacao" className="pt-5 space-y-6">
          <Section title="Regime Tributário da Transportadora (Emitente)">
            <p className="text-xs text-muted-foreground mb-2">
              Selecione o enquadramento tributário da empresa transportadora para parametrização fiscal correta do CT-e.
            </p>
            <CardRadio
              value={form.regime_tributario}
              onChange={(v) => update("regime_tributario", v as CteData["regime_tributario"])}
              options={[
                {
                  v: "simples",
                  t: "Simples Nacional",
                  d: "Optante pelo Simples Nacional (Microempresa / EPP).",
                },
                {
                  v: "mei",
                  t: "MEI Transportador",
                  d: "Microempreendedor Individual (MEI Caminhoneiro).",
                },
                {
                  v: "normal",
                  t: "Regime Normal (Lucro Presumido / Real)",
                  d: "Apuração regular de Débito e Crédito de ICMS.",
                },
              ]}
            />
          </Section>

          <Section title="Perfil do Tomador e Códigos Fiscais">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Indicador do Tomador do Serviço" className="md:col-span-2">
                <Combobox
                  options={IND_IE_DEST_OPTIONS}
                  value={form.indicador_tomador}
                  onChange={(v) => update("indicador_tomador", v)}
                  placeholder="Selecione o perfil do tomador (Contribuinte / Não Contribuinte)..."
                />
              </Field>
              <Field label="CFOP de Prestação (Tomador Contribuinte)">
                <Combobox
                  options={CFOP_OPTIONS.filter((o) => o.hint?.includes("CT-e") && !o.hint?.includes("Entrada") && !o.hint?.includes("Não Contrib."))}
                  value={form.cfop}
                  onChange={(v) => update("cfop", v)}
                  placeholder="Ex.: 5352 / 6352"
                />
              </Field>
              <Field label="CFOP de Prestação (Tomador Não Contribuinte)">
                <Combobox
                  options={CFOP_OPTIONS.filter((o) => o.hint?.includes("CT-e") && !o.hint?.includes("Entrada") && o.hint?.includes("Não Contrib."))}
                  value={form.cfop_nao_contrib}
                  onChange={(v) => update("cfop_nao_contrib", v)}
                  placeholder="Ex.: 5357 / 6357"
                />
              </Field>
              <Field label="CFOP de Entrada de Transporte (Aquisição de Serviço)" className="md:col-span-2">
                <Combobox
                  options={CFOP_OPTIONS.filter((o) => o.hint?.includes("CT-e") && o.hint?.includes("Entrada"))}
                  value={form.cfop_entrada}
                  onChange={(v) => update("cfop_entrada", v)}
                  placeholder="Ex.: 1352 / 1353 / 2352 / 2353 - Aquisição de serviço de transporte"
                />
              </Field>
            </div>
          </Section>

          <Section title="ICMS do Transporte — Contribuinte & Não Contribuinte">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="CST ICMS — Tomador Contribuinte">
                <Combobox
                  options={CST_ICMS_OPTIONS}
                  value={form.cst}
                  onChange={(v) => update("cst", v)}
                  placeholder="Selecione o CST p/ contribuinte..."
                />
              </Field>
              <Field label="CST ICMS — Tomador Não Contribuinte">
                <Combobox
                  options={CST_ICMS_OPTIONS}
                  value={form.cst_nao_contrib}
                  onChange={(v) => update("cst_nao_contrib", v)}
                  placeholder="Selecione o CST p/ não contribuinte..."
                />
              </Field>
              <Field label="Alíquota ICMS — Contribuinte (%)">
                <div className="relative">
                  <Input
                    inputMode="decimal"
                    value={form.aliquota ?? ""}
                    onChange={(e) => update("aliquota", e.target.value.replace(/[^\d.,]/g, "").replace(",", "."))}
                    placeholder="0,00"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
              </Field>
              <Field label="Alíquota ICMS — Não Contribuinte (%)">
                <div className="relative">
                  <Input
                    inputMode="decimal"
                    value={form.aliquota_nao_contrib ?? ""}
                    onChange={(e) => update("aliquota_nao_contrib", e.target.value.replace(/[^\d.,]/g, "").replace(",", "."))}
                    placeholder="0,00"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
              </Field>
              <Field label="Redução de Base de Cálculo (%)" className="md:col-span-2">
                <div className="relative">
                  <Input
                    inputMode="decimal"
                    value={form.reducao_bc ?? ""}
                    onChange={(e) => update("reducao_bc", e.target.value.replace(/[^\d.,]/g, "").replace(",", "."))}
                    placeholder="0,00"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
              </Field>
            </div>
          </Section>

          <Section title="Considerações">
            <Textarea
              value={form.observacoes ?? ""}
              onChange={(e) => update("observacoes", e.target.value)}
              rows={6}
              placeholder="Particularidades do transporte, exceções, observações para a equipe Certifica+..."
            />
          </Section>
        </TabsContent>

        <TabsContent value="final" className="pt-5 space-y-4">
          <div className="rounded-xl border bg-muted/30 p-5 text-sm">
            <p className="font-semibold flex items-center gap-2 mb-1">
              <Truck className="h-4 w-4 text-primary" /> Revisão CT-e
            </p>
            <p className="text-muted-foreground">
              Confira as 4 abas anteriores. Os dados são salvos automaticamente.
            </p>
          </div>
          {showFinishButton && (
            <div className="flex justify-end fixed bottom-0 left-0 right-0 z-40 p-4 bg-background border-t shadow-lg md:static md:p-0 md:bg-transparent md:border-0 md:shadow-none">
              <Button onClick={onFinish} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Check className="h-4 w-4" /> Salvar e Enviar Parametrização
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ----------------- Primitives ------------------ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>}
      {children}
    </div>
  );
}

type CardOption = string | { v: string; t: string };

function CardGroup({
  options,
  value,
  onChange,
}: {
  options: CardOption[];
  value?: string;
  onChange: (v: string) => void;
}) {
  const normalized = options.map((o) => (typeof o === "string" ? { v: o, t: o } : o));
  return (
    <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
      {normalized.map((o) => {
        const selected = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={cn(
              "text-left rounded-lg border-2 p-3 text-sm transition-all hover:border-primary/40 relative",
              selected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card",
            )}
          >
            {selected && <Check className="absolute top-2 right-2 h-3.5 w-3.5 text-primary" />}
            <span className="font-medium">{o.t}</span>
          </button>
        );
      })}
    </div>
  );
}

function CardRadio<V extends string>({
  value,
  onChange,
  options,
}: {
  value?: V;
  onChange: (v: V) => void;
  options: { v: V; t: string; d: string }[];
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            "text-left rounded-xl border-2 p-4 transition-all hover:border-primary/40",
            value === o.v ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card",
          )}
        >
          <div className="font-semibold text-sm">{o.t}</div>
          <div className="text-xs text-muted-foreground mt-1">{o.d}</div>
        </button>
      ))}
    </div>
  );
}

