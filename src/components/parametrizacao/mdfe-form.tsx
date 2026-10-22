import { useState } from "react";
import { Check, FileText, Truck, Upload, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CnpjInput } from "@/components/parametrizacao/cnpj-input";
import { useCnpjLookup } from "@/hooks/use-cnpj-lookup";

export type MdfeData = {
  // Aba 1
  mdfe_razao_social?: string;
  mdfe_cnpj_cpf?: string;
  mdfe_certificado_arquivo?: { name: string; size: number };
  mdfe_certificado_senha?: string;
  mdfe_ultimo_numero?: string;
  mdfe_ultima_serie?: string;
  // Aba 2
  mdfe_tipo_emitente?: "prestador" | "carga_propria" | "outro";
  mdfe_tipo_transportador?: "etc" | "tac" | "ctc";
  mdfe_placa?: string;
  mdfe_renavam?: string;
  mdfe_rntrc?: string;
  mdfe_uf_placa?: string;
  mdfe_tipo_veiculo?: string;
  mdfe_tipo_rodado?: string;
  mdfe_tipo_carroceria?: string;
  // Opções específicas de TAC (Transportador Autônomo de Cargas)
  mdfe_tac_subtipo?: "independente" | "agregado" | "equiparado";
  mdfe_tac_ciot?: string;
  mdfe_tac_ciot_resp_doc?: string;
  mdfe_tac_nome?: string;
  mdfe_tac_cpf?: string;
  mdfe_tac_rntrc?: string;
  mdfe_tac_forma_pagto?: "a_vista" | "a_prazo" | "ipef" | "pix" | "outro";
  mdfe_tac_ipef_cnpj?: string;
  mdfe_tac_ipef_nome?: string;
  mdfe_tac_valor_frete?: string;
  mdfe_tac_valor_adiantamento?: string;
  mdfe_tac_valor_saldo?: string;
  mdfe_tac_dados_bancarios?: string;
  mdfe_tac_usa_vale_pedagio?: boolean;
  mdfe_tac_vale_pedagio_fornecedora?: string;
  mdfe_tac_vale_pedagio_resp_doc?: string;
  mdfe_tac_vale_pedagio_numero?: string;
  mdfe_tac_vale_pedagio_valor?: string;
  // Aba 3
  mdfe_tipo_propriedade?: "proprio" | "terceiro" | "outro";
  mdfe_proprietario_nome?: string;
  mdfe_proprietario_doc?: string;
  mdfe_proprietario_endereco?: string;
  mdfe_motorista?: string;
  // Aba 4
  mdfe_seguradora_nome?: string;
  mdfe_seguradora_cnpj?: string;
  mdfe_seguradora_apolice?: string;
  mdfe_chaves_referenciadas?: string;
  mdfe_observacoes?: string;
};

type Props = {
  form: MdfeData;
  update: <K extends keyof MdfeData>(key: K, value: MdfeData[K]) => void;
  onFinish: () => void | Promise<void>;
  hideEmpresa?: boolean;
  showFinishButton?: boolean;
};

const ALL_TABS = [
  { key: "empresa", label: "Empresa & Certificado", icon: FileText },
  { key: "numeracao", label: "Numeração MDF-e", icon: FileText },
  { key: "veiculo", label: "Veículo", icon: Truck },
  { key: "propriedade", label: "Propriedade & Tipo", icon: Users },
  { key: "seguro", label: "Seguro · Final", icon: Check },
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

export function MdfeForm({ form, update, onFinish, hideEmpresa, showFinishButton = true }: Props) {
  const TABS = hideEmpresa ? ALL_TABS.filter((t) => t.key !== "empresa") : ALL_TABS;
  const [tab, setTab] = useState<string>(TABS[0].key);
  return (
    <div className="bg-card border rounded-2xl p-4 md:p-6 shadow-sm w-full min-w-0 max-w-full overflow-hidden">
      <Tabs value={tab} onValueChange={setTab} className="w-full min-w-0">
        <TabsList className="flex flex-wrap md:flex-nowrap overflow-x-auto gap-1.5 bg-muted/80 p-1.5 rounded-xl w-full justify-start items-center max-w-full">
          {TABS.map((t, i) => (
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

        {!hideEmpresa && (
          <TabsContent value="empresa" className="pt-5">
            <EmpresaTab form={form} update={update} />
            <NextBar onNext={() => setTab("numeracao")} />
          </TabsContent>
        )}
        <TabsContent value="numeracao" className="pt-5">
          <NumeracaoTab form={form} update={update} />
          <NextBar onNext={() => setTab("veiculo")} />
        </TabsContent>
        <TabsContent value="veiculo" className="pt-5">
          <VeiculoTab form={form} update={update} />
          <NextBar onNext={() => setTab("propriedade")} />
        </TabsContent>
        <TabsContent value="propriedade" className="pt-5">
          <PropriedadeTab form={form} update={update} />
          <NextBar onNext={() => setTab("seguro")} />
        </TabsContent>
        <TabsContent value="seguro" className="pt-5 space-y-6">
          <SeguroTab form={form} update={update} />
          {showFinishButton && (
            <div className="flex justify-end fixed bottom-0 left-0 right-0 z-40 p-4 bg-background border-t shadow-lg md:static md:p-0 md:bg-transparent md:border-0 md:shadow-none">
              <Button onClick={onFinish} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Check className="h-4 w-4" /> Salvar e Enviar MDF-e
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NextBar({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex justify-end mt-6">
      <Button variant="outline" onClick={onNext}>Próximo →</Button>
    </div>
  );
}

type T = {
  form: MdfeData;
  update: <K extends keyof MdfeData>(key: K, value: MdfeData[K]) => void;
};

function EmpresaTab({ form, update }: T) {
  function onCert(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    update("mdfe_certificado_arquivo", { name: f.name, size: f.size });
  }
  const { loading: cnpjLoading, lookup } = useCnpjLookup((d) => {
    if (d.razao_social) update("mdfe_razao_social", d.razao_social);
  });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Razão Social" className="md:col-span-2">
        <Input value={form.mdfe_razao_social ?? ""} onChange={(e) => update("mdfe_razao_social", e.target.value)} placeholder="Empresa LTDA" />
      </Field>
      <Field label="CNPJ / CPF">
        <CnpjInput value={form.mdfe_cnpj_cpf ?? ""} onChange={(e) => update("mdfe_cnpj_cpf", e.target.value)} onLookup={lookup} loading={cnpjLoading} placeholder="00.000.000/0000-00" />
      </Field>
      <div />
      <Field label="Certificado Digital PJ A1" className="md:col-span-2">
        <label className="flex items-center gap-3 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-muted/40 transition">
          <Upload className="h-4 w-4 text-primary" />
          <span className="text-sm flex-1 truncate">
            {form.mdfe_certificado_arquivo?.name ?? "Anexar arquivo .pfx / .p12"}
          </span>
          {form.mdfe_certificado_arquivo && (
            <span className="text-xs text-muted-foreground">
              {Math.round(form.mdfe_certificado_arquivo.size / 1024)} KB
            </span>
          )}
          <input type="file" accept=".pfx,.p12" className="hidden" onChange={onCert} />
        </label>
      </Field>
      <Field label="Senha do Certificado">
        <Input type="password" value={form.mdfe_certificado_senha ?? ""} onChange={(e) => update("mdfe_certificado_senha", e.target.value)} placeholder="••••••••" />
      </Field>
      <div />
      <Field label="Número do último manifesto emitido">
        <Input inputMode="numeric" value={form.mdfe_ultimo_numero ?? ""} onChange={(e) => update("mdfe_ultimo_numero", e.target.value.replace(/\D/g, ""))} placeholder="0" />
      </Field>
      <Field label="Série do último manifesto">
        <Input inputMode="numeric" value={form.mdfe_ultima_serie ?? ""} onChange={(e) => update("mdfe_ultima_serie", e.target.value.replace(/\D/g, ""))} placeholder="1" />
      </Field>
    </div>
  );
}

function NumeracaoTab({ form, update }: T) {
  return (
    <div className="space-y-6">
      <div className="border rounded-xl p-4 md:p-5">
        <h3 className="font-semibold text-sm mb-3">Numeração e Últimos Documentos Emitidos (MDF-e)</h3>
        <p className="text-xs text-muted-foreground mb-4 break-words leading-relaxed">
          Informe o número e a série do último MDF-e emitido ou autorizado na SEFAZ, além das chaves de acesso dos últimos documentos fiscais (CT-e / NF-e) para vinculação no manifesto.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Número do último MDF-e emitido">
            <Input
              inputMode="numeric"
              value={form.mdfe_ultimo_numero ?? ""}
              onChange={(e) => update("mdfe_ultimo_numero", e.target.value.replace(/\D/g, ""))}
              placeholder="Ex.: 450"
            />
            <span className="text-[11px] text-muted-foreground">
              Último número de MDF-e emitido ou autorizado na SEFAZ.
            </span>
          </Field>
          <Field label="Série do MDF-e">
            <Input
              inputMode="numeric"
              value={form.mdfe_ultima_serie ?? ""}
              onChange={(e) => update("mdfe_ultima_serie", e.target.value.replace(/\D/g, ""))}
              placeholder="Ex.: 1"
            />
            <span className="text-[11px] text-muted-foreground">
              Série padrão do documento (geralmente 1).
            </span>
          </Field>
        </div>
      </div>

      <Field label="Chaves de acesso de CT-e ou NF-e referenciadas (Últimos Documentos)">
        <Textarea
          rows={4}
          value={form.mdfe_chaves_referenciadas ?? ""}
          onChange={(e) => update("mdfe_chaves_referenciadas", e.target.value)}
          placeholder="Cole as chaves de acesso de 44 dígitos dos últimos documentos fiscais (CT-e / NF-e), uma por linha."
        />
        <span className="text-[11px] text-muted-foreground">
          Chaves de acesso dos documentos fiscais que compõem a carga transportada.
        </span>
      </Field>
    </div>
  );
}

function VeiculoTab({ form, update }: T) {
  return (
    <div className="space-y-6">
      <Section title="Dados do Veículo">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Placa do Veículo">
            <Input
              value={form.mdfe_placa ?? ""}
              onChange={(e) => update("mdfe_placa", e.target.value.toUpperCase())}
              placeholder="ABC-1D23"
            />
          </Field>
          <Field label="Renavam">
            <Input
              inputMode="numeric"
              value={form.mdfe_renavam ?? ""}
              onChange={(e) => update("mdfe_renavam", e.target.value.replace(/\D/g, ""))}
              placeholder="00000000000"
            />
          </Field>
          <Field label="RNTRC (ou ANTT)">
            <Input
              value={form.mdfe_rntrc ?? ""}
              onChange={(e) => update("mdfe_rntrc", e.target.value)}
              placeholder="00000000"
            />
          </Field>
          <Field label="UF da Placa">
            <select
              value={form.mdfe_uf_placa ?? ""}
              onChange={(e) => update("mdfe_uf_placa", e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Selecione...</option>
              {UFS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Tipo de Rodado">
        <CardGroup
          options={RODADOS}
          value={form.mdfe_tipo_rodado}
          onChange={(v) => update("mdfe_tipo_rodado", v)}
        />
      </Section>

      <Section title="Tipo de Carroceria">
        <CardGroup
          options={CARROCERIAS}
          value={form.mdfe_tipo_carroceria}
          onChange={(v) => update("mdfe_tipo_carroceria", v)}
        />
      </Section>

      <Section title="Tipo de Emitente">
        <CardRadio
          value={form.mdfe_tipo_emitente}
          onChange={(v) => update("mdfe_tipo_emitente", v as MdfeData["mdfe_tipo_emitente"])}
          options={[
            { v: "prestador", t: "Prestador de serviço de transporte", d: "Transportadora que presta serviços a terceiros." },
            { v: "carga_propria", t: "Transportador de carga própria", d: "Empresa que transporta a própria mercadoria." },
            { v: "outro", t: "Outro", d: "Demais hipóteses previstas em legislação." },
          ]}
        />
      </Section>

      <Section title="Tipo de Transportador">
        <CardRadio
          value={form.mdfe_tipo_transportador}
          onChange={(v) => update("mdfe_tipo_transportador", v as MdfeData["mdfe_tipo_transportador"])}
          options={[
            { v: "etc", t: "ETC", d: "Empresa Transporte Rodoviário de Carga." },
            { v: "tac", t: "TAC", d: "Transportador Autônomo de Cargas." },
            { v: "ctc", t: "CTC", d: "Cooperativa de Transporte de Cargas." },
          ]}
        />
      </Section>

      {form.mdfe_tipo_transportador === "tac" && (
        <div className="rounded-2xl border-2 border-dashed border-primary/40 p-4 md:p-5 bg-primary/5 space-y-5">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-foreground">
                Configurações do TAC (Transportador Autônomo de Cargas)
              </h4>
              <p className="text-xs text-muted-foreground">
                Parâmetros fiscais, CIOT, pagamento do frete e vale-pedágio obrigatório (ANTT / SEFAZ).
              </p>
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Categoria / Subtipo do TAC (ANTT)
            </Label>
            <CardRadio
              value={form.mdfe_tac_subtipo}
              onChange={(v) => update("mdfe_tac_subtipo", v as MdfeData["mdfe_tac_subtipo"])}
              options={[
                {
                  v: "independente",
                  t: "TAC Independente",
                  d: "Atua por conta própria, sem exclusividade, aceitando fretes esporádicos ou viagens pontuais conforme a demanda.",
                },
                {
                  v: "agregado",
                  t: "TAC Agregado",
                  d: "Mantém relação contínua e exclusividade parcial ou total com a empresa/transportadora por período determinado.",
                },
                {
                  v: "equiparado",
                  t: "TAC Equiparado",
                  d: "Pessoa jurídica (ou ME) com frota reduzida de até 3 veículos próprios, com tratamento fiscal e regulatório de autônomo perante a ANTT.",
                },
              ]}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="CIOT (Código Identificador da Operação de Transporte)">
              <Input
                value={form.mdfe_tac_ciot ?? ""}
                onChange={(e) => update("mdfe_tac_ciot", e.target.value)}
                placeholder="Ex.: 123456789012"
              />
              <span className="text-[11px] text-muted-foreground">
                Código gerado na ANTT/IPEF para a operação com transportador autônomo.
              </span>
            </Field>

            <Field label="CPF / CNPJ do Responsável pelo CIOT">
              <Input
                value={form.mdfe_tac_ciot_resp_doc ?? ""}
                onChange={(e) => update("mdfe_tac_ciot_resp_doc", e.target.value)}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
              />
              <span className="text-[11px] text-muted-foreground">
                Documento do contratante/embarcador responsável pelo CIOT.
              </span>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Nome do TAC / Autônomo">
              <Input
                value={form.mdfe_tac_nome ?? ""}
                onChange={(e) => update("mdfe_tac_nome", e.target.value)}
                placeholder="Nome completo do autônomo"
              />
            </Field>
            <Field label="CPF do TAC">
              <Input
                value={form.mdfe_tac_cpf ?? ""}
                onChange={(e) => update("mdfe_tac_cpf", e.target.value)}
                placeholder="000.000.000-00"
              />
            </Field>
            <Field label="RNTRC do TAC (ANTT)">
              <Input
                value={form.mdfe_tac_rntrc ?? ""}
                onChange={(e) => update("mdfe_tac_rntrc", e.target.value)}
                placeholder="00000000"
              />
            </Field>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Forma de Pagamento do Frete (TAC)
            </Label>
            <CardGroup
              options={[
                { v: "a_vista", t: "À Vista" },
                { v: "a_prazo", t: "A Prazo" },
                { v: "ipef", t: "Cartão Frete / IPEF" },
                { v: "pix", t: "PIX / Conta Bancária" },
              ]}
              value={form.mdfe_tac_forma_pagto}
              onChange={(v) => update("mdfe_tac_forma_pagto", v as MdfeData["mdfe_tac_forma_pagto"])}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Valor Total do Frete (R$)">
              <Input
                inputMode="decimal"
                value={form.mdfe_tac_valor_frete ?? ""}
                onChange={(e) => update("mdfe_tac_valor_frete", e.target.value)}
                placeholder="0,00"
              />
            </Field>
            <Field label="Valor Adiantamento (R$)">
              <Input
                inputMode="decimal"
                value={form.mdfe_tac_valor_adiantamento ?? ""}
                onChange={(e) => update("mdfe_tac_valor_adiantamento", e.target.value)}
                placeholder="0,00"
              />
            </Field>
            <Field label="Saldo de Quitação (R$)">
              <Input
                inputMode="decimal"
                value={form.mdfe_tac_valor_saldo ?? ""}
                onChange={(e) => update("mdfe_tac_valor_saldo", e.target.value)}
                placeholder="0,00"
              />
            </Field>
          </div>

          {(form.mdfe_tac_forma_pagto === "ipef" || form.mdfe_tac_ipef_cnpj) && (
            <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-primary/20">
              <Field label="CNPJ da IPEF / Administradora">
                <Input
                  value={form.mdfe_tac_ipef_cnpj ?? ""}
                  onChange={(e) => update("mdfe_tac_ipef_cnpj", e.target.value)}
                  placeholder="00.000.000/0000-00 (Ex: Repom, Pamcard)"
                />
              </Field>
              <Field label="Nome da IPEF / Administradora">
                <Input
                  value={form.mdfe_tac_ipef_nome ?? ""}
                  onChange={(e) => update("mdfe_tac_ipef_nome", e.target.value)}
                  placeholder="Ex.: Repom, Pamcard, Roadcard, TicketLog"
                />
              </Field>
            </div>
          )}

          {form.mdfe_tac_forma_pagto === "pix" && (
            <Field label="Chave PIX / Dados Bancários do TAC">
              <Input
                value={form.mdfe_tac_dados_bancarios ?? ""}
                onChange={(e) => update("mdfe_tac_dados_bancarios", e.target.value)}
                placeholder="Chave PIX ou Banco / Agência / Conta"
              />
            </Field>
          )}

          {/* Vale-Pedágio Obrigatório */}
          <div className="pt-2 border-t border-primary/20 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="mdfe_tac_usa_vale_pedagio"
                checked={!!form.mdfe_tac_usa_vale_pedagio}
                onChange={(e) => update("mdfe_tac_usa_vale_pedagio", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
              <Label htmlFor="mdfe_tac_usa_vale_pedagio" className="text-xs font-semibold cursor-pointer">
                Fornece Vale-Pedágio Obrigatório (Lei nº 10.209/2001)
              </Label>
            </div>

            {form.mdfe_tac_usa_vale_pedagio && (
              <div className="grid gap-4 md:grid-cols-2 pt-2">
                <Field label="CNPJ da Fornecedora do Vale-Pedágio">
                  <Input
                    value={form.mdfe_tac_vale_pedagio_fornecedora ?? ""}
                    onChange={(e) => update("mdfe_tac_vale_pedagio_fornecedora", e.target.value)}
                    placeholder="00.000.000/0000-00 (Sem Parar, ConectCar, Veloe...)"
                  />
                </Field>
                <Field label="CPF / CNPJ do Responsável pelo Pagamento">
                  <Input
                    value={form.mdfe_tac_vale_pedagio_resp_doc ?? ""}
                    onChange={(e) => update("mdfe_tac_vale_pedagio_resp_doc", e.target.value)}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  />
                </Field>
                <Field label="Número do Comprovante / Ticket">
                  <Input
                    value={form.mdfe_tac_vale_pedagio_numero ?? ""}
                    onChange={(e) => update("mdfe_tac_vale_pedagio_numero", e.target.value)}
                    placeholder="Número do ticket/comprovante"
                  />
                </Field>
                <Field label="Valor do Vale-Pedágio (R$)">
                  <Input
                    inputMode="decimal"
                    value={form.mdfe_tac_vale_pedagio_valor ?? ""}
                    onChange={(e) => update("mdfe_tac_vale_pedagio_valor", e.target.value)}
                    placeholder="0,00"
                  />
                </Field>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PropriedadeTab({ form, update }: T) {
  const terceiro = form.mdfe_tipo_propriedade === "terceiro";
  return (
    <div className="space-y-6">
      <Section title="Tipo de Propriedade">
        <CardGroup
          options={[
            { v: "proprio", t: "Próprio" },
            { v: "terceiro", t: "Terceiro" },
            { v: "outro", t: "Outro" },
          ]}
          value={form.mdfe_tipo_propriedade}
          onChange={(v) => update("mdfe_tipo_propriedade", v as MdfeData["mdfe_tipo_propriedade"])}
        />
        {terceiro && (
          <div className="grid gap-4 md:grid-cols-2 rounded-xl border-2 border-dashed border-primary/40 p-4 bg-primary/5 mt-4">
            <Field label="Nome do Proprietário">
              <Input
                value={form.mdfe_proprietario_nome ?? ""}
                onChange={(e) => update("mdfe_proprietario_nome", e.target.value)}
                placeholder="Nome completo / Razão Social"
              />
            </Field>
            <Field label="CPF / CNPJ do Proprietário">
              <Input
                value={form.mdfe_proprietario_doc ?? ""}
                onChange={(e) => update("mdfe_proprietario_doc", e.target.value)}
                placeholder="000.000.000-00"
              />
            </Field>
            <Field label="Endereço Completo do Proprietário" className="md:col-span-2">
              <Textarea
                rows={2}
                value={form.mdfe_proprietario_endereco ?? ""}
                onChange={(e) => update("mdfe_proprietario_endereco", e.target.value)}
                placeholder="Rua, número, bairro, cidade, UF, CEP"
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
          value={form.mdfe_tipo_veiculo}
          onChange={(v) => update("mdfe_tipo_veiculo", v as MdfeData["mdfe_tipo_veiculo"])}
        />
      </Section>

      <Section title="Dados do Motorista">
        <Textarea
          rows={4}
          value={form.mdfe_motorista ?? ""}
          onChange={(e) => update("mdfe_motorista", e.target.value)}
          placeholder="Nome completo, CPF e endereço completo do motorista."
        />
      </Section>
    </div>
  );
}

function SeguroTab({ form, update }: T) {
  return (
    <div className="space-y-6">
      <div className="border rounded-xl p-4 md:p-5">
        <h3 className="font-semibold text-sm mb-3">Seguradora (opcional)</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome da Seguradora">
            <Input value={form.mdfe_seguradora_nome ?? ""} onChange={(e) => update("mdfe_seguradora_nome", e.target.value)} placeholder="Ex.: Seguradora XYZ" />
          </Field>
          <Field label="CNPJ da Seguradora">
            <Input value={form.mdfe_seguradora_cnpj ?? ""} onChange={(e) => update("mdfe_seguradora_cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
          </Field>
          <Field label="Número da Apólice" className="md:col-span-2">
            <Input value={form.mdfe_seguradora_apolice ?? ""} onChange={(e) => update("mdfe_seguradora_apolice", e.target.value)} placeholder="Apólice nº..." />
          </Field>
        </div>
      </div>

      <Field label="Chaves de acesso de CT-e ou NF-e referenciadas">
        <Textarea
          rows={4}
          value={form.mdfe_chaves_referenciadas ?? ""}
          onChange={(e) => update("mdfe_chaves_referenciadas", e.target.value)}
          placeholder="Cole uma chave de 44 dígitos por linha."
        />
      </Field>

      <Field label="Considerações finais">
        <Textarea
          rows={5}
          value={form.mdfe_observacoes ?? ""}
          onChange={(e) => update("mdfe_observacoes", e.target.value)}
          placeholder="Observações livres sobre a operação."
        />
      </Field>
    </div>
  );
}

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

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>}
      {children}
    </div>
  );
}
