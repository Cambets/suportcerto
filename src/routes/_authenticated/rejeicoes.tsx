import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  GraduationCap,
  Search,
  Copy,
  Check,
  AlertTriangle,
  Stethoscope,
  ListChecks,
  FileCheck2,
  AlertOctagon,
  HelpCircle,
  BellRing,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SEFAZ_REJEICOES,
  SEFAZ_CATEGORIAS,
  SEFAZ_CONCEITOS,
  searchRejeicoes,
  type SefazRejeicao,
  type SefazConceito,
} from "@/data/sefaz-rejeicoes";

export const Route = createFileRoute("/_authenticated/rejeicoes")({
  component: RejeicoesPage,
});

function getBadgeVariant(codigo: string, msg: string) {
  if (codigo === "120" || msg.toLowerCase().includes("alerta")) {
    return {
      label: `AUTORIZADO C/ ALERTA ${codigo}`,
      className: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300",
      icon: BellRing,
    };
  }
  if (["100", "101", "102", "124", "135"].includes(codigo)) {
    return {
      label: `STATUS ${codigo}`,
      className: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300",
      icon: FileCheck2,
    };
  }
  if (msg.toLowerCase().includes("denegad") || ["110", "301", "302", "303"].includes(codigo)) {
    return {
      label: `USO DENEGADO ${codigo}`,
      className: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300",
      icon: AlertOctagon,
    };
  }
  return {
    label: `REJEIÇÃO ${codigo}`,
    className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/50 dark:text-red-300",
    icon: AlertTriangle,
  };
}

function RejeicoesPage() {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("Todas");
  const [copied, setCopied] = useState<string | null>(null);
  const [showConceitos, setShowConceitos] = useState<boolean>(true);

  const filtered = useMemo(() => {
    return searchRejeicoes(search, selectedCat);
  }, [search, selectedCat]);

  // Contagem por categoria
  const countsByCat = useMemo(() => {
    const counts: Record<string, number> = { Todas: SEFAZ_REJEICOES.length };
    for (const item of SEFAZ_REJEICOES) {
      counts[item.categoria] = (counts[item.categoria] ?? 0) + 1;
    }
    return counts;
  }, []);

  // Filtro de conceitos baseado na busca
  const filteredConceitos = useMemo(() => {
    if (!search.trim()) return SEFAZ_CONCEITOS;
    const q = search.toLowerCase();
    return SEFAZ_CONCEITOS.filter((c) => {
      if (c.titulo.toLowerCase().includes(q) || c.secao.toLowerCase().includes(q)) return true;
      return Object.entries(c.conteudo).some(
        ([k, v]) => k.toLowerCase().includes(q) || v.toLowerCase().includes(q)
      );
    });
  }, [search]);

  async function copySolution(r: SefazRejeicao) {
    const text = `📋 Guia de Resolução — ${r.mensagem_oficial_sefaz || `Código ${r.codigo}`}
Modelo(s): ${r.modelos}
Categoria: ${r.categoria}

⚠️ Causa Provável:
${r.causa_provavel}

🩺 Como Resolver:
${r.como_resolver}

🛠️ Passo a Passo no ERP:
${r.passo_a_passo_erp}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(r.codigo);
      toast.success(`Guia da Rejeição ${r.codigo} copiado com sucesso!`);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  async function copyConceito(c: SefazConceito) {
    const text = `📘 Conceito Normativo SEFAZ — ${c.secao}
${Object.entries(c.conteudo)
  .map(([k, v]) => `• ${k}: ${v}`)
  .join("\n")}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(c.secao);
      toast.success(`Conceito copiado com sucesso!`);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <header className="bg-card/70 backdrop-blur-md border-b px-4 md:px-8 py-5 sticky top-0 z-10 shadow-xs">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                    Base de Conhecimento — Rejeições SEFAZ
                  </h1>
                  <Badge variant="secondary" className="font-mono text-xs">
                    MOC 7.0 + NT 2026.002 · {SEFAZ_REJEICOES.length} Códigos
                  </Badge>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  Manual oficial com causa provável, diagnóstico, passo a passo para o ERP e nova regra de Autorização com Alerta (cStat 120).
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConceitos((prev) => !prev)}
              className="gap-1.5 text-xs shrink-0 self-start sm:self-auto"
            >
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              {showConceitos ? "Ocultar Conceitos Normativos" : "Ver Conceitos Normativos"}
              <Badge variant="secondary" className="text-[10px] ml-1 px-1.5 py-0">
                {SEFAZ_CONCEITOS.length}
              </Badge>
              {showConceitos ? (
                <ChevronUp className="h-3.5 w-3.5 ml-0.5 opacity-60" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 ml-0.5 opacity-60" />
              )}
            </Button>
          </div>

          {/* Barra de Busca */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Busque por código (ex.: 120, 539, 203), alerta, rejeição, causa ou termo do ERP..."
              className="pl-12 pr-4 h-11 md:h-12 text-sm md:text-base rounded-xl bg-card border-muted-foreground/20 shadow-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-md bg-muted"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Categorias / Filtros em Pills horizontais */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs no-scrollbar">
            {SEFAZ_CATEGORIAS.map((cat) => {
              const count = countsByCat[cat] ?? 0;
              const isSelected = selectedCat === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCat(cat)}
                  className={`px-3 py-1.5 rounded-lg font-medium shrink-0 transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-transparent"
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Listagem */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Bloco de Conceitos Normativos (incluindo cStat 120 e Denegação) */}
          {showConceitos && filteredConceitos.length > 0 && (
            <section className="space-y-3 bg-muted/30 border border-border/70 rounded-2xl p-4 md:p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm md:text-base font-bold tracking-tight">
                      Conceitos Normativos & Novidades SEFAZ
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Regras estruturais: Autorização com Alerta (NT 2026.002) e tratamento de Denegação.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {filteredConceitos.length} {filteredConceitos.length === 1 ? "conceito" : "conceitos"}
                </Badge>
              </div>

              <div className="grid gap-3.5">
                {filteredConceitos.map((c, idx) => {
                  const is120 = c.secao.includes("120");
                  return (
                    <div
                      key={idx}
                      className={`p-4 md:p-5 rounded-xl border transition-all ${
                        is120
                          ? "bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-300 dark:border-cyan-800"
                          : "bg-card border-border/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm md:text-base font-bold text-foreground flex items-center gap-2">
                            {is120 ? (
                              <BellRing className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                            ) : (
                              <Info className="h-4 w-4 text-primary" />
                            )}
                            {c.secao}
                          </h3>
                          {is120 && (
                            <Badge className="bg-cyan-600 text-white dark:bg-cyan-700 text-[10px] py-0 px-2">
                              NT 2026.002 v1.11
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyConceito(c)}
                          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                        >
                          {copied === c.secao ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" /> Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" /> Copiar
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
                        {Object.entries(c.conteudo).map(([rotulo, desc]) => (
                          <div
                            key={rotulo}
                            className={`p-2.5 rounded-lg border ${
                              rotulo.includes("orientar")
                                ? "sm:col-span-2 bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                                : rotulo.includes("Diferença") || rotulo.includes("O que é")
                                ? "sm:col-span-2 bg-background/80 border-border/40"
                                : "bg-background/80 border-border/40"
                            }`}
                          >
                            <span className="font-bold uppercase tracking-wider text-[11px] block mb-1 text-muted-foreground">
                              {rotulo}
                            </span>
                            <p className="leading-relaxed text-foreground/90">{desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Exibindo <strong>{filtered.length}</strong> de <strong>{SEFAZ_REJEICOES.length}</strong> códigos
              {selectedCat !== "Todas" && ` em "${selectedCat}"`}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 bg-card border rounded-2xl p-8 space-y-3">
              <HelpCircle className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
              <h3 className="font-semibold text-base">Nenhum código encontrado</h3>
              <p className="text-xs md:text-sm text-muted-foreground max-w-md mx-auto">
                Não encontramos nenhum código ou motivo correspondente a "{search}". Tente buscar apenas pelo número do erro (ex.: 120, 203, 539) ou limpe o filtro.
              </p>
              <Button variant="outline" size="sm" onClick={() => { setSearch(""); setSelectedCat("Todas"); }}>
                Restaurar todos os códigos
              </Button>
            </div>
          ) : (
            filtered.map((r) => {
              const badgeInfo = getBadgeVariant(r.codigo, r.mensagem_oficial_sefaz);
              const BadgeIcon = badgeInfo.icon;
              return (
                <article
                  key={`${r.codigo}-${r.categoria}`}
                  className="bg-card border rounded-2xl p-5 md:p-6 shadow-xs hover:shadow-md transition-all duration-200"
                >
                  {/* Cabeçalho do Card */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4 pb-3 border-b border-border/50">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <Badge className={`text-xs px-2.5 py-1 shrink-0 font-bold flex items-center gap-1.5 border ${badgeInfo.className}`}>
                        <BadgeIcon className="h-3.5 w-3.5" />
                        {badgeInfo.label}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base md:text-lg font-semibold leading-snug break-words">
                          {r.mensagem_oficial_sefaz || `Código ${r.codigo}`}
                        </h2>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border/40">
                            {r.categoria}
                          </span>
                          <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
                            {r.modelos}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copySolution(r)}
                      className="gap-2 shrink-0 self-end sm:self-auto text-xs"
                    >
                      {copied === r.codigo ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" /> Copiar Guia
                        </>
                      )}
                    </Button>
                  </div>

                  {/* 3 Blocos de Conteúdo */}
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Causa */}
                    <div className="bg-amber-500/5 rounded-xl p-3.5 border border-amber-500/20 space-y-1.5">
                      <h3 className="text-xs uppercase font-bold tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Causa Provável
                      </h3>
                      <p className="text-xs md:text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                        {r.causa_provavel}
                      </p>
                    </div>

                    {/* Como Resolver */}
                    <div className="bg-blue-500/5 rounded-xl p-3.5 border border-blue-500/20 space-y-1.5">
                      <h3 className="text-xs uppercase font-bold tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                        <Stethoscope className="h-3.5 w-3.5" />
                        Diagnóstico & Resolução
                      </h3>
                      <p className="text-xs md:text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                        {r.como_resolver}
                      </p>
                    </div>

                    {/* Passo a Passo no ERP */}
                    <div className="bg-emerald-500/5 rounded-xl p-3.5 border border-emerald-500/20 space-y-1.5 md:col-span-1">
                      <h3 className="text-xs uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <ListChecks className="h-3.5 w-3.5" />
                        Passo a Passo no ERP
                      </h3>
                      <p className="text-xs md:text-sm text-foreground/90 leading-relaxed whitespace-pre-line font-medium">
                        {r.passo_a_passo_erp}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
