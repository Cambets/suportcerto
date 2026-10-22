import { ExternalLink, PlayCircle, CheckCircle2, Building2, Zap, LifeBuoy, ShieldAlert, HelpCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const BANCOS_AUTOMATICOS = [
  { code: "341", name: "Itaú Unibanco S.A." },
  { code: "033", name: "Banco Santander (Brasil) S.A." },
  { code: "237", name: "Banco Bradesco S.A." },
  { code: "001", name: "Banco do Brasil S.A." },
  { code: "756", name: "Sicoob / BANCOOB" },
  { code: "748", name: "Banco Cooperativo Sicredi S.A." },
  { code: "104", name: "Caixa Econômica Federal" },
  { code: "041", name: "Banrisul — RS" },
  { code: "422", name: "Banco Safra S.A." },
  { code: "707", name: "Banco Daycoval S.A." },
  { code: "085", name: "Cecred (Ailos)" },
  { code: "136", name: "CC Unicred do Brasil" },
  { code: "133", name: "Banco Cresol" },
  { code: "070", name: "BRB — Banco de Brasília S.A." },
  { code: "637", name: "Banco Sofisa" },
  { code: "084", name: "Uniprime Norte do Paraná" },
];

const BANCOS_TRADICIONAIS = [
  { name: "Banco Inter", tag: "Modo Tradicional" },
  { name: "Banco Cora", tag: "Integração Direta API" },
];

const PASSOS = [
  "Ativar o adicional de boleto na licença do cliente.",
  "Deixar o boleto funcionando em modo tradicional (remessa e retorno testados).",
  "Preencher a carta de transmissão automática específica do banco (VAN Nexxera ou Finnet).",
  "Entregar a carta assinada na gerência do banco da conta do cliente.",
  "Abrir chamado na Tecnospeed anexando a carta para liberação (prazo de até 90 dias conforme o banco).",
];

const VIDEOS = [
  { title: "Boletos — Ativação e Parâmetros", url: "https://www.youtube.com/watch?v=0JJA8cFeR-Q" },
  { title: "Cadastro Forma de Pagamento — Boleto", url: "https://www.youtube.com/watch?v=FwcJzQRMH7w" },
];

const LINKS = [
  {
    label: "Como solicitar a transmissão automática junto ao banco",
    url: "https://atendimento.tecnospeed.com.br/hc/pt-br/articles/360015378694-Como-solicitar-a-transmiss%C3%A3o-autom%C3%A1tica-junto-ao-banco",
  },
  {
    label: "Como preencher a carta para transmissão",
    url: "https://atendimento.tecnospeed.com.br/hc/pt-br/articles/360020482074-Como-preencher-a-carta-para-a-transmiss%C3%A3o-autom%C3%A1tica",
  },
  {
    label: "Lista oficial e atualizada Tecnospeed",
    url: "https://atendimento.tecnospeed.com.br/hc/pt-br/articles/360015272893-Bancos-Homologados",
  },
];

export function HomologacaoBoletosSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="mt-1.5 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2"
        >
          <HelpCircle className="h-3 w-3" />
          Central de Homologação de Boletos
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Central de Homologação de Boletos
          </SheetTitle>
          <SheetDescription className="text-xs leading-relaxed">
            Consulte a lista de bancos homologados via Tecnospeed/API e os procedimentos para ativação automática.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Bloco 1 — Lista de Bancos */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Bancos Homologados
              </h3>
              <Tabs defaultValue="auto" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="auto" className="text-xs">Transmissão Automática</TabsTrigger>
                  <TabsTrigger value="trad" className="text-xs">Tradicional / API</TabsTrigger>
                </TabsList>

                <TabsContent value="auto" className="mt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {BANCOS_AUTOMATICOS.map((b) => (
                      <div
                        key={b.code}
                        className="flex items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-mono text-[11px] text-muted-foreground">{b.code}</div>
                          <div className="truncate font-medium">{b.name}</div>
                        </div>
                        <Badge
                          variant="outline"
                          className="shrink-0 border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px]"
                        >
                          Automático
                        </Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="trad" className="mt-3">
                  <div className="grid grid-cols-1 gap-2">
                    {BANCOS_TRADICIONAIS.map((b) => (
                      <div
                        key={b.name}
                        className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-xs"
                      >
                        <span className="font-medium">{b.name}</span>
                        <Badge
                          variant="outline"
                          className="shrink-0 border-blue-300 bg-blue-50 text-blue-700 text-[10px]"
                        >
                          {b.tag}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </section>

            {/* Bloco 2 — Passo a passo */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Passo a passo — Remessa Automática
              </h3>
              <ol className="rounded-lg border bg-primary/5 p-4 space-y-2.5">
                {PASSOS.map((p, i) => (
                  <li key={i} className="flex gap-3 text-xs leading-relaxed">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                      {i + 1}
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            </section>

            {/* Bloco 3 — Vídeos e Links */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-primary" />
                Treinamento e Links Úteis
              </h3>

              <div className="grid grid-cols-1 gap-2">
                {VIDEOS.map((v) => (
                  <a
                    key={v.url}
                    href={v.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-xs hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <div className="rounded-md bg-red-100 p-1.5">
                      <PlayCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <span className="flex-1 font-medium">{v.title}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                ))}
              </div>

              <div className="space-y-1.5 pt-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                  Links Oficiais
                </p>
                {LINKS.map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{l.label}</span>
                  </a>
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>

        {/* Rodapé — Alerta */}
        <div className="border-t bg-amber-50 px-6 py-3">
          <div className="flex items-start gap-2 text-[11px] leading-relaxed text-amber-900">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <p>
              Dúvidas sobre bancos novos ou regras específicas? Oriente o cliente a abrir um chamado em{" "}
              <a
                href="https://www.avantesuporte.com.br"
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline underline-offset-2 hover:text-amber-700 inline-flex items-center gap-0.5"
              >
                www.avantesuporte.com.br
                <LifeBuoy className="h-3 w-3" />
              </a>{" "}
              para validação da nossa equipe técnica.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
