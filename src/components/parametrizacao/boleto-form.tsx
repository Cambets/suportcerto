import { Check, CreditCard, Upload, FileUp, X, Info, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { HomologacaoBoletosSheet } from "./homologacao-boletos-sheet";

export type BoletoData = {
  // Conta e beneficiário
  banco?: string;
  tipo_conta?: string;
  agencia?: string;
  agencia_digito?: string;
  conta?: string;
  conta_digito?: string;
  codigo_beneficiario?: string;
  convenio?: string;
  carteira?: string;

  // Regras de emissão
  cnab?: string;
  especie_documento?: string;
  ultimo_nosso_numero?: string;

  // Credenciais Sicoob (condicional)
  sicoob_client_id?: string;
  sicoob_usuario_dev?: string;
  sicoob_senha_dev?: string;

  // Controle de remessa (condicional)
  numero_remessa?: string;
  densidade_remessa?: string;

  // Instruções adicionais
  multa_percent?: string;
  juros_percent_mes?: string;
  protesto_dias?: string;
  instrucoes_juros_desconto?: string;

  // Anexo opcional
  boleto_referencia?: { name: string; size: number };
};

type Props = {
  form: BoletoData;
  update: <K extends keyof BoletoData>(key: K, value: BoletoData[K]) => void;
  onFinish: () => void;
  hideFinishButton?: boolean;
};

const BANCOS: ComboboxOption[] = [
  { value: "001", label: "001 — Banco do Brasil" },
  { value: "237", label: "237 — Bradesco" },
  { value: "341", label: "341 — Itaú Unibanco" },
  { value: "033", label: "033 — Santander" },
  { value: "104", label: "104 — Caixa Econômica Federal" },
  { value: "756", label: "756 — Sicoob" },
  { value: "748", label: "748 — Sicredi" },
];

const TIPO_CONTA: ComboboxOption[] = [
  { value: "corrente", label: "Conta Corrente" },
  { value: "poupanca", label: "Conta Poupança" },
];

const CNAB_OPTIONS: ComboboxOption[] = [
  { value: "240", label: "CNAB 240" },
  { value: "400", label: "CNAB 400" },
];

const ESPECIE_OPTIONS: ComboboxOption[] = [
  { value: "DM", label: "DM — Duplicata Mercantil" },
  { value: "DS", label: "DS — Duplicata de Serviço" },
  { value: "NP", label: "NP — Nota Promissória" },
  { value: "RC", label: "RC — Recibo" },
  { value: "OU", label: "OU — Outros" },
];

const DENSIDADE_OPTIONS: ComboboxOption[] = [
  { value: "1600", label: "1600 BPI" },
  { value: "6250", label: "6250 BPI" },
];



function codigoBeneficiarioLabel(banco?: string): { label: string; tooltip: string } {
  switch (banco) {
    case "341":
      return {
        label: "Código da Empresa / Código do Cedente",
        tooltip: "Itaú: identificação da empresa cedente fornecida pelo gerente da conta.",
      };
    case "001":
      return {
        label: "Número do Convênio (Lido no Extrato)",
        tooltip: "Banco do Brasil: número do convênio de cobrança visível no seu extrato bancário.",
      };
    default:
      return {
        label: "Código do Beneficiário",
        tooltip: "Código fornecido pelo banco que identifica a empresa como emissora de boletos.",
      };
  }
}

export function BoletoForm({ form, update, onFinish, hideFinishButton }: Props) {
  const bancoCode = form.banco ?? "";
  const isSicoob = bancoCode === "756";
  const isItau = bancoCode === "341";
  const isBB = bancoCode === "001";
  const bancosComRemessa = ["748", "237", "104"]; // Sicredi, Bradesco, Caixa
  const bancosComDensidade = ["033", "237"];       // Santander, Bradesco
  const showRemessa = bancosComRemessa.includes(bancoCode);
  const showDensidade = bancosComDensidade.includes(bancoCode);

  const codBenef = codigoBeneficiarioLabel(bancoCode);

  // ---------- Validações de bloco (para indicador "Tudo Certo!") ----------
  const agenciaOk = !!form.agencia && /^\d+$/.test(form.agencia);
  const agenciaDvOk = isItau ? true : !form.agencia_digito || /^[0-9X]{1,2}$/i.test(form.agencia_digito);
  const contaOk = !!form.conta && /^\d+$/.test(form.conta);
  const contaDvValidChar = isBB ? /^[0-9X]$/i : /^\d$/;
  const contaDvOk = !!form.conta_digito && contaDvValidChar.test(form.conta_digito);
  const bloco1Ready = !!form.banco && !!form.tipo_conta && agenciaOk && agenciaDvOk && contaOk && contaDvOk;

  const bloco2Ready = !!form.cnab && !!form.especie_documento;

  // ---------- Handlers com máscara ----------
  const handleContaDigito = (raw: string) => {
    if (isBB) {
      // Aceita 1 char: número ou X (auto-uppercase)
      const cleaned = raw.replace(/[^0-9xX]/g, "").slice(0, 1).toUpperCase();
      update("conta_digito", cleaned);
    } else {
      update("conta_digito", raw.replace(/\D/g, "").slice(0, 2));
    }
  };

  const handleAgenciaDigito = (raw: string) => {
    if (isItau) return; // desabilitado
    update("agencia_digito", raw.replace(/\D/g, "").slice(0, 2));
  };

  const applyMarketDefaults = () => {
    update("multa_percent", "2,00");
    update("juros_percent_mes", "1,00");
    update("protesto_dias", "5");
    toast.success("Padrão de mercado aplicado", {
      description: "Multa 2,00% · Juros 1,00% a.m. · Protesto após 5 dias úteis.",
    });
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-card border rounded-2xl p-4 md:p-6 shadow-sm space-y-6">
        {/* Cabeçalho */}
        <header className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 shrink-0">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-bold leading-tight">Opções de Boleto Bancário</h2>
              <p className="text-xs md:text-[13px] text-muted-foreground mt-1 leading-relaxed">
                Preencha os dados abaixo para a homologação e emissão de boletos. Em caso de dúvidas,
                consulte o gerente da sua conta bancária.
              </p>
              <div className="mt-1.5">
                <HomologacaoBoletosSheet />
              </div>
            </div>
          </div>

          <BoletoAnexo file={form.boleto_referencia} onFile={(f) => update("boleto_referencia", f)} />
        </header>

        {/* Bloco 1 — Conta e Beneficiário */}
        <Section title="Dados da Conta e Beneficiário" ready={bloco1Ready}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <LabeledField label="Banco">
              <Combobox
                options={BANCOS}
                value={form.banco}
                onChange={(v) => update("banco", v)}
                placeholder="Selecione o banco..."
                searchPlaceholder="Buscar por código ou nome..."
                allowCustom={false}
              />
            </LabeledField>
            <LabeledField label="Tipo de Conta">
              <Combobox
                options={TIPO_CONTA}
                value={form.tipo_conta}
                onChange={(v) => update("tipo_conta", v)}
                allowCustom={false}
                placeholder="Selecione..."
              />
            </LabeledField>
            <div />

            <LabeledField label="Nº Agência">
              <div className="flex gap-2">
                <Input
                  value={form.agencia ?? ""}
                  onChange={(e) => update("agencia", e.target.value.replace(/\D/g, ""))}
                  placeholder="0000"
                  inputMode="numeric"
                />
                <div className="w-16 shrink-0">
                  <Input
                    value={isItau ? "" : (form.agencia_digito ?? "")}
                    onChange={(e) => handleAgenciaDigito(e.target.value)}
                    placeholder={isItau ? "—" : "DV"}
                    maxLength={2}
                    disabled={isItau}
                    aria-label="Dígito da agência"
                  />
                </div>
              </div>
              {isItau && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Itaú não utiliza dígito verificador na agência.
                </p>
              )}
            </LabeledField>

            <LabeledField label="Nº Conta">
              <div className="flex gap-2">
                <Input
                  value={form.conta ?? ""}
                  onChange={(e) => update("conta", e.target.value.replace(/\D/g, ""))}
                  placeholder="00000000"
                  inputMode="numeric"
                />
                <Input
                  value={form.conta_digito ?? ""}
                  onChange={(e) => handleContaDigito(e.target.value)}
                  placeholder={isBB ? "DV/X" : "DV"}
                  maxLength={isBB ? 1 : 2}
                  className="w-16 shrink-0 uppercase"
                  inputMode={isBB ? "text" : "numeric"}
                />
              </div>
              {isBB && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Banco do Brasil aceita o dígito &quot;X&quot; quando aplicável.
                </p>
              )}
            </LabeledField>

            <LabeledField label={codBenef.label} tooltip={codBenef.tooltip}>
              <Input
                value={form.codigo_beneficiario ?? ""}
                onChange={(e) => update("codigo_beneficiario", e.target.value)}
                placeholder="Ex.: 123456-7"
              />
            </LabeledField>

            <LabeledField label="Número do Convênio">
              <Input
                value={form.convenio ?? ""}
                onChange={(e) => update("convenio", e.target.value)}
                placeholder="Ex.: 1234567"
              />
            </LabeledField>

            <LabeledField label="Código da Carteira">
              <Input
                value={form.carteira ?? ""}
                onChange={(e) => update("carteira", e.target.value)}
                placeholder="Ex.: 109"
              />
            </LabeledField>
          </div>
        </Section>

        {/* Bloco 2 — Regras de Emissão */}
        <Section title="Regras de Emissão e Arquivos" ready={bloco2Ready}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LabeledField label="Padrão CNAB">
              <Combobox
                options={CNAB_OPTIONS}
                value={form.cnab}
                onChange={(v) => update("cnab", v)}
                allowCustom={false}
                placeholder="Selecione..."
              />
            </LabeledField>

            <LabeledField label="Espécie do Documento">
              <Combobox
                options={ESPECIE_OPTIONS}
                value={form.especie_documento}
                onChange={(v) => update("especie_documento", v)}
                placeholder="Selecione..."
              />
            </LabeledField>

            <LabeledField
              label="Nº do Último Boleto Gerado (Nosso Número)"
              tooltip="Informe o número do último boleto emitido no seu sistema anterior para que o ERP continue a sequência corretamente a partir do próximo número."
            >
              <Input
                value={form.ultimo_nosso_numero ?? ""}
                onChange={(e) => update("ultimo_nosso_numero", e.target.value)}
                placeholder="Ex.: 000123456"
                inputMode="numeric"
              />
            </LabeledField>
          </div>
        </Section>

        {/* Bloco 3 — Condicional Sicoob */}
        {isSicoob && (
          <Section title="Credenciais Sicoob (Portal Developer)" tone="accent">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <LabeledField label="Client ID">
                <Input
                  value={form.sicoob_client_id ?? ""}
                  onChange={(e) => update("sicoob_client_id", e.target.value)}
                  placeholder="Ex.: 9b5e...-xxxx"
                />
              </LabeledField>
              <LabeledField label="Usuário Portal Developer">
                <Input
                  value={form.sicoob_usuario_dev ?? ""}
                  onChange={(e) => update("sicoob_usuario_dev", e.target.value)}
                  placeholder="usuario@empresa"
                />
              </LabeledField>
              <LabeledField label="Senha Portal Developer">
                <Input
                  type="password"
                  value={form.sicoob_senha_dev ?? ""}
                  onChange={(e) => update("sicoob_senha_dev", e.target.value)}
                  placeholder="••••••••"
                />
              </LabeledField>
            </div>
          </Section>
        )}

        {/* Bloco 3.b — Controle de Remessa condicional */}
        {(showRemessa || showDensidade) && (
          <Section title="Controle de Remessa">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showRemessa && (
                <LabeledField
                  label="Número da Remessa"
                  tooltip="Número sequencial do próximo arquivo de remessa a ser gerado. Exigido por Sicredi, Bradesco e Caixa."
                >
                  <Input
                    value={form.numero_remessa ?? ""}
                    onChange={(e) => update("numero_remessa", e.target.value)}
                    placeholder="Ex.: 000001"
                    inputMode="numeric"
                  />
                </LabeledField>
              )}
              {showDensidade && (
                <LabeledField label="Densidade da Remessa">
                  <Combobox
                    options={DENSIDADE_OPTIONS}
                    value={form.densidade_remessa}
                    onChange={(v) => update("densidade_remessa", v)}
                    allowCustom={false}
                    placeholder="Selecione..."
                  />
                </LabeledField>
              )}
            </div>
          </Section>
        )}

        {/* Bloco 4 — Instruções */}
        <Section title="Instruções Adicionais">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Regras de Juros, Multa e Protesto (Opcional)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={applyMarketDefaults}
                className="gap-1.5 h-8 text-xs border-dashed"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Usar Padrão de Mercado
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <LabeledField label="Multa (%)">
                <Input
                  value={form.multa_percent ?? ""}
                  onChange={(e) => update("multa_percent", e.target.value)}
                  placeholder="Ex.: 2,00"
                  inputMode="decimal"
                />
              </LabeledField>
              <LabeledField label="Juros (% ao mês)">
                <Input
                  value={form.juros_percent_mes ?? ""}
                  onChange={(e) => update("juros_percent_mes", e.target.value)}
                  placeholder="Ex.: 1,00"
                  inputMode="decimal"
                />
              </LabeledField>
              <LabeledField label="Protestar após (dias úteis)">
                <Input
                  value={form.protesto_dias ?? ""}
                  onChange={(e) => update("protesto_dias", e.target.value.replace(/\D/g, ""))}
                  placeholder="Ex.: 5"
                  inputMode="numeric"
                />
              </LabeledField>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Observações adicionais (Opcional)
              </Label>
              <Textarea
                value={form.instrucoes_juros_desconto ?? ""}
                onChange={(e) => update("instrucoes_juros_desconto", e.target.value)}
                rows={4}
                placeholder="Ex.: desconto de R$ 10,00 até 3 dias antes do vencimento, instruções específicas para o cedente..."
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Caso queira customizar as instruções de cobrança, informe as taxas e prazos desejados nos campos acima.
              </p>
            </div>
          </div>
        </Section>

        {!hideFinishButton && (
          <div className="flex justify-end fixed bottom-0 left-0 right-0 z-40 p-4 bg-background border-t shadow-lg md:static md:p-0 md:bg-transparent md:border-0 md:shadow-none">
            <Button onClick={onFinish} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Check className="h-4 w-4" /> Salvar e Enviar Parametrização
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

/* ---------------- Anexo (upload compacto) ---------------- */

function BoletoAnexo({
  file,
  onFile,
}: {
  file?: { name: string; size: number };
  onFile: (f: BoletoData["boleto_referencia"]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const f = files?.[0];
      if (!f) return;
      if (!f.type.startsWith("image/") && !f.type.includes("pdf")) {
        toast.error("Envie uma imagem (PNG/JPG) ou PDF do boleto.");
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error("O arquivo excede 5 MB.");
        return;
      }
      onFile({ name: f.name, size: f.size });
      toast.success("Boleto de referência anexado.");
    },
    [onFile],
  );

  if (file) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <FileUp className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="truncate font-medium text-emerald-900">{file.name}</span>
          <span className="text-[11px] text-emerald-700/80 shrink-0">
            {(file.size / 1024).toFixed(1)} KB
          </span>
        </div>
        <button
          type="button"
          onClick={() => onFile(undefined)}
          className="text-emerald-700 hover:text-emerald-900"
          aria-label="Remover anexo"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs cursor-pointer transition-colors",
        dragging
          ? "border-primary bg-primary/5 text-primary"
          : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary",
      )}
    >
      <Upload className="h-3.5 w-3.5" />
      <span>Anexar imagem de um boleto já emitido para conferência (Opcional)</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </label>
  );
}

/* ---------------- Primitives ---------------- */

function Section({
  title,
  children,
  tone = "default",
  ready = false,
}: {
  title: string;
  children: React.ReactNode;
  tone?: "default" | "accent";
  ready?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border p-4 md:p-5 transition-colors",
        ready
          ? "border-emerald-300/70 bg-emerald-50/40 dark:bg-emerald-950/10"
          : tone === "accent"
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-background",
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {ready && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[11px] font-medium">
            <ShieldCheck className="h-3 w-3" />
            Dados prontos para homologação
          </span>
        )}
      </div>
      {children}
    </section>
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
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        {label}
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center text-muted-foreground hover:text-primary transition"
                aria-label="Mais informações"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </Label>
      {children}
    </div>
  );
}
