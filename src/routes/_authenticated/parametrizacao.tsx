import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ClipboardCheck,
  Copy,
  Plus,
  Trash2,
  Eye,
  ExternalLink,
  Check,
  X,
  Paperclip,
  Download,
  User,
  Building2,
  FileSignature,
  Receipt,
  FolderOpen,
  MessageSquare,
  MoreHorizontal,
  MessageCircle,
  Clock,
  CalendarClock,
  ShieldCheck,
  Loader2,
  CreditCard,
  Landmark,
  KeyRound,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/lib/admin.functions";
import {
  createParameterization,
  deleteParameterization,
  duplicateParameterization,
  listParameterizations,
  regenerateParameterizationToken,
  updateParameterization,
  getCertificateDownloadUrl,
} from "@/lib/parameterizations.functions";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, RefreshCw, Copy as CopyIcon, FileDown, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/parametrizacao")({
  ssr: false,
  component: ParametrizacaoPage,
});

type FormType = "nfe" | "nfce" | "mdfe" | "cte" | "nfse";
type Row = {
  id: string;
  client_name: string;
  form_type: FormType;
  form_types?: FormType[] | null;
  status: string;
  step_current: number;
  public_token: string;
  created_at: string;
  updated_at: string;
  form_data: Record<string, unknown>;
};

const TYPE_LABELS: Record<FormType, string> = {
  nfe: "NF-e",
  nfce: "NFC-e",
  mdfe: "MDF-e",
  cte: "CT-e",
  nfse: "NFS-e",
};

function getPublicBase() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return import.meta.env?.VITE_PUBLIC_URL || "http://localhost:3000";
}

function buildPublicUrl(token: string) {
  return `${getPublicBase()}/p/${token}`;
}

function fmtDateTime(v?: string) {
  if (!v) return "—";
  return new Date(v).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ParametrizacaoPage() {
  const navigate = useNavigate();
  const checkIsAdminFn = useServerFn(checkIsAdmin);
  const listFn = useServerFn(listParameterizations);
  const createFn = useServerFn(createParameterization);
  const deleteFn = useServerFn(deleteParameterization);
  const updateFn = useServerFn(updateParameterization);
  const regenFn = useServerFn(regenerateParameterizationToken);
  const dupFn = useServerFn(duplicateParameterization);
  const [authChecked, setAuthChecked] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTypes, setNewTypes] = useState<FormType[]>([]);
  const [newIncludeBoleto, setNewIncludeBoleto] = useState(false);
  const [viewRow, setViewRow] = useState<Row | null>(null);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FormType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pendente" | "em_andamento" | "concluido">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearSelection() {
    setSelectedIds(new Set());
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const hasLocalDev = typeof window !== 'undefined' && localStorage.getItem("visitor_id");
        if (!data?.user && !hasLocalDev) {
          return navigate({ to: "/auth", replace: true });
        }
        if (!cancelled) setAuthChecked(true);
      } catch {
        const hasLocalDev = typeof window !== 'undefined' && localStorage.getItem("visitor_id");
        if (hasLocalDev && !cancelled) {
          setAuthChecked(true);
        } else {
          navigate({ to: "/auth", replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkIsAdminFn, navigate]);

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["parameterizations"],
    queryFn: () => listFn() as Promise<Row[]>,
    enabled: authChecked,
    refetchInterval: 2000,
  });

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterType !== "all") {
        const rawTypes = Array.isArray(r.form_types) && r.form_types.length > 0 ? r.form_types : [r.form_type];
        const types = Array.isArray(rawTypes) ? rawTypes : [];
        if (!types.includes(filterType)) return false;
      }
      if (q && !r.client_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, filterType, filterStatus]);

  const columns = useMemo(() => {
    const pendente: Row[] = [];
    const em_andamento: Row[] = [];
    const concluido: Row[] = [];
    for (const r of filteredRows) {
      if (r.status === "concluido") concluido.push(r);
      else if (r.status === "em_andamento") em_andamento.push(r);
      else pendente.push(r);
    }
    return { pendente, em_andamento, concluido };
  }, [filteredRows]);

  async function handleCreate() {
    if (!newName.trim() || newTypes.length === 0) return;
    try {
      const row = await createFn({ data: { client_name: newName.trim(), form_types: newTypes, include_boleto: newIncludeBoleto } });
      const url = buildPublicUrl(row.public_token);
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Link gerado e copiado!", { description: url });
      setOpenCreate(false);
      setNewName("");
      setNewTypes([]);
      setNewIncludeBoleto(false);
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteFn({ data: { id } });
      toast.success("Removido");
      setSelectedIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkConfirmOpen(false);
    try {
      const results = await Promise.allSettled(ids.map((id) => deleteFn({ data: { id } })));
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) toast.success(`${ids.length} cadastro(s) excluído(s)`);
      else toast.error(`${failed} de ${ids.length} falharam ao excluir`);
      clearSelection();
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro na exclusão em massa");
    }
  }

  async function handleRegenerate(row: Row) {
    try {
      // Regenerar link também reabre um formulário já concluído (destrava a assinatura)
      const reopen = row.status === "concluido";
      const updated = await regenFn({ data: { id: row.id, reopen } });
      const url = buildPublicUrl((updated as any).public_token);
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success(reopen ? "Formulário reaberto e novo link copiado!" : "Novo link gerado e copiado!", {
        description: `${url} · válido por 30 dias`,
      });
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao regenerar");
    }
  }


  async function handleDuplicate(row: Row) {
    try {
      await dupFn({ data: { id: row.id } });
      toast.success("Cadastro duplicado");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao duplicar");
    }
  }

  function exportCsv() {
    const header = ["Cliente", "Módulos", "Status", "Etapa", "Criado em", "Atualizado em", "Link"];
    const lines = [header.join(";")];
    for (const r of filteredRows) {
      const types = (r.form_types && r.form_types.length > 0 ? r.form_types : [r.form_type]).join("/");
      const cells = [
        r.client_name,
        types,
        r.status,
        String(r.step_current ?? 0),
        new Date(r.created_at).toLocaleString("pt-BR"),
        new Date(r.updated_at).toLocaleString("pt-BR"),
        buildPublicUrl(r.public_token),
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`);
      lines.push(cells.join(";"));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parametrizacoes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyLink(token: string) {
    const url = buildPublicUrl(token);
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!", { description: url });
  }

  function shareWhatsApp(row: Row) {
    const url = buildPublicUrl(row.public_token);
    const text = `Olá! Segue o link para a parametrização fiscal do cliente ${row.client_name}: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  if (!authChecked) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-muted/20">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-xl">
              <ClipboardCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Parametrização</h1>
              <p className="text-sm text-muted-foreground">
                Quadro de implantação fiscal · {rows.length} processo{rows.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportCsv} className="gap-2">
              <FileDown className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button onClick={() => setOpenCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Link
            </Button>
          </div>
        </header>

        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente..."
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger className="md:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pendente">Aguardando</SelectItem>
              <SelectItem value="em_andamento">Em Preenchimento</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
            <SelectTrigger className="md:w-44"><SelectValue placeholder="Módulo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os módulos</SelectItem>
              {(Object.keys(TYPE_LABELS) as FormType[]).map((t) => (
                <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!isLoading && filteredRows.length > 0 && (() => {
          const allIds = filteredRows.map((r) => r.id);
          const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
          const someSelected = allIds.some((id) => selectedIds.has(id));
          return (
            <div className="flex items-center justify-between rounded-lg border bg-card/60 px-3 py-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={(c) => {
                    if (c) setSelectedIds(new Set(allIds));
                    else clearSelection();
                  }}
                />
                <span className="font-medium">
                  Selecionar todos os visíveis ({filteredRows.length})
                </span>
              </label>
              {selectedIds.size > 0 && (
                <span className="text-muted-foreground">
                  {selectedIds.size} selecionado{selectedIds.size === 1 ? "" : "s"}
                </span>
              )}
            </div>
          );
        })()}

        {isLoading ? (
          <div className="rounded-xl border bg-card py-16 text-center text-sm text-muted-foreground">
            Carregando quadro...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-24">
            <KanbanColumn
              title="Aguardando Contador"
              subtitle="Link gerado, ainda não acessado"
              dotClassName="bg-slate-400"
              count={columns.pendente.length}
            >
              {columns.pendente.length === 0 && <EmptyHint label="Nenhum processo aguardando." />}
              {columns.pendente.map((r) => (
                <PendingCard
                  key={r.id}
                  row={r}
                  selected={selectedIds.has(r.id)}
                  onToggleSelect={() => toggleSelected(r.id)}
                  onCopy={() => copyLink(r.public_token)}
                  onWhatsApp={() => shareWhatsApp(r)}
                  onEdit={() => setEditRow(r)}
                  onRegenerate={() => handleRegenerate(r)}
                  onDuplicate={() => handleDuplicate(r)}
                  onDelete={() => handleDelete(r.id)}
                />
              ))}
            </KanbanColumn>

            <KanbanColumn
              title="Em Preenchimento"
              subtitle="Contador iniciou e está editando"
              dotClassName="bg-amber-500"
              count={columns.em_andamento.length}
            >
              {columns.em_andamento.length === 0 && <EmptyHint label="Nenhum em andamento." />}
              {columns.em_andamento.map((r) => (
                <InProgressCard
                  key={r.id}
                  row={r}
                  selected={selectedIds.has(r.id)}
                  onToggleSelect={() => toggleSelected(r.id)}
                  onCopy={() => copyLink(r.public_token)}
                  onWhatsApp={() => shareWhatsApp(r)}
                  onView={() => setViewRow(r)}
                  onEdit={() => setEditRow(r)}
                  onRegenerate={() => handleRegenerate(r)}
                  onDuplicate={() => handleDuplicate(r)}
                  onDelete={() => handleDelete(r.id)}
                />
              ))}
            </KanbanColumn>

            <KanbanColumn
              title="Concluído"
              subtitle="Formulário enviado pelo contador"
              dotClassName="bg-emerald-500"
              count={columns.concluido.length}
            >
              {columns.concluido.length === 0 && <EmptyHint label="Nada concluído ainda." />}
              {columns.concluido.map((r) => (
                <DoneCard
                  key={r.id}
                  row={r}
                  selected={selectedIds.has(r.id)}
                  onToggleSelect={() => toggleSelected(r.id)}
                  onView={() => setViewRow(r)}
                  onEdit={() => setEditRow(r)}
                  onDuplicate={() => handleDuplicate(r)}
                  onDelete={() => handleDelete(r.id)}
                />
              ))}
            </KanbanColumn>
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-full border bg-card shadow-lg px-4 py-2">
          <span className="text-sm font-medium">
            {selectedIds.size} selecionado{selectedIds.size === 1 ? "" : "s"}
          </span>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            Limpar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={() => setBulkConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> Excluir selecionados
          </Button>
        </div>
      )}

      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {selectedIds.size} cadastro{selectedIds.size === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os links ficarão inválidos e os dados preenchidos serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <EditParameterizationDialog
        row={editRow}
        onClose={() => setEditRow(null)}
        onSave={async (patch) => {
          if (!editRow) return;
          try {
            await updateFn({ data: { id: editRow.id, ...patch } });
            toast.success("Cadastro atualizado");
            setEditRow(null);
            refetch();
          } catch (e: any) {
            toast.error(e?.message ?? "Erro ao salvar");
          }
        }}
      />


      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo link de parametrização</DialogTitle>
            <DialogDescription>
              Gere um link único para enviar ao contador do cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Tipos de parametrização{" "}
                <span className="text-muted-foreground font-normal">(selecione um ou mais)</span>
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(
                  [
                    { v: "nfe", t: "NF-e", d: "Notas Fiscais Eletrônicas" },
                    { v: "nfce", t: "NFC-e", d: "Notas de Consumidor" },
                    { v: "mdfe", t: "MDF-e", d: "Manifesto de Documentos" },
                    { v: "cte", t: "CT-e", d: "Conhecimento de Transporte" },
                    { v: "nfse", t: "NFS-e", d: "Nota Fiscal de Serviço" },
                  ] as const
                ).map((o) => {
                  const selected = newTypes.includes(o.v);
                  return (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() =>
                        setNewTypes((prev) =>
                          prev.includes(o.v) ? prev.filter((t) => t !== o.v) : [...prev, o.v],
                        )
                      }
                      className={`relative text-left rounded-lg border-2 p-3 transition ${
                        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      {selected && <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />}
                      <div className="font-semibold text-sm">{o.t}</div>
                      <div className="text-xs text-muted-foreground">{o.d}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Módulos adicionais{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <button
                type="button"
                onClick={() => setNewIncludeBoleto((v) => !v)}
                className={`relative w-full text-left rounded-lg border-2 p-3 transition ${
                  newIncludeBoleto ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                {newIncludeBoleto && <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />}
                <div className="font-semibold text-sm">Configuração de Boletos Bancários</div>
                <div className="text-xs text-muted-foreground">
                  Habilita o bloco de homologação bancária (CNAB, convênio, carteira) no formulário do cliente.
                </div>
              </button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_name">Nome do cliente / empresa</Label>
              <Input
                id="client_name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex.: Padaria São João Ltda"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || newTypes.length === 0}>
              Gerar link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewRow} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent className="sm:max-w-3xl sm:max-h-[88vh] overflow-y-auto sm:overflow-hidden sm:flex sm:flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewRow?.client_name}
              {viewRow && <StatusBadge status={viewRow.status} />}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <div className="rounded-md border bg-muted/30 px-3 py-2 flex items-center gap-2 text-xs">
                  <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Criado em:</span>
                  <span className="font-medium text-foreground">{fmtDateTime(viewRow?.created_at)}</span>
                </div>
                <div className="rounded-md border bg-muted/30 px-3 py-2 flex items-center gap-2 text-xs">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {viewRow?.status === "concluido" ? "Concluído em:" : "Última atualização:"}
                  </span>
                  <span className="font-medium text-foreground">{fmtDateTime(viewRow?.updated_at)}</span>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          {viewRow && <FormDataViewer data={viewRow.form_data ?? {}} formTypes={viewRow.form_types ?? []} clientName={viewRow.client_name} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KanbanColumn({
  title,
  subtitle,
  count,
  dotClassName,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  dotClassName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card/60 flex flex-col min-h-[400px]">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${dotClassName}`} />
          <div>
            <h2 className="text-sm font-semibold leading-tight">{title}</h2>
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {count}
        </Badge>
      </div>
      <div className="p-3 space-y-2.5 flex-1">{children}</div>
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-background/40 py-8 text-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}

function TypeBadges({ row }: { row: Row }) {
  const types = (row.form_types && row.form_types.length > 0 ? row.form_types : [row.form_type]) as FormType[];
  return (
    <div className="flex flex-wrap gap-1">
      {types.map((t) => (
        <Badge key={t} variant="outline" className="text-[10px] font-mono uppercase px-1.5 py-0">
          {TYPE_LABELS[t] ?? t}
        </Badge>
      ))}
    </div>
  );
}

function CardShell({ children, selected }: { children: React.ReactNode; selected?: boolean }) {
  return (
    <div
      className={`rounded-lg border bg-card p-3 shadow-sm hover:shadow transition-shadow space-y-2.5 ${
        selected ? "ring-2 ring-primary border-primary/60" : ""
      }`}
    >
      {children}
    </div>
  );
}

function CardHeader({
  row,
  menu,
  selected,
  onToggleSelect,
}: {
  row: Row;
  menu: React.ReactNode;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      {onToggleSelect && (
        <Checkbox
          checked={!!selected}
          onCheckedChange={onToggleSelect}
          aria-label="Selecionar cadastro"
          className="mt-0.5"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm truncate">{row.client_name}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Criado em {fmtDateTime(row.created_at)}
        </p>
      </div>
      {menu}
    </div>
  );
}

type AdminActions = {
  onEdit: () => void;
  onRegenerate?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

function AdminMenuItems({ onEdit, onRegenerate, onDuplicate }: AdminActions) {
  return (
    <>
      <DropdownMenuItem onClick={onEdit}>
        <Pencil className="h-4 w-4" /> Editar cadastro
      </DropdownMenuItem>
      {onRegenerate && (
        <DropdownMenuItem onClick={onRegenerate}>
          <RefreshCw className="h-4 w-4" /> Regenerar link
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={onDuplicate}>
        <CopyIcon className="h-4 w-4" /> Duplicar
      </DropdownMenuItem>
    </>
  );
}

function PendingCard({
  row,
  selected,
  onToggleSelect,
  onCopy,
  onWhatsApp,
  onEdit,
  onRegenerate,
  onDuplicate,
  onDelete,
}: {
  row: Row;
  selected?: boolean;
  onToggleSelect?: () => void;
  onCopy: () => void;
  onWhatsApp: () => void;
} & AdminActions) {
  return (
    <CardShell selected={selected}>
      <CardHeader
        row={row}
        selected={selected}
        onToggleSelect={onToggleSelect}

        menu={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onCopy}>
                <Copy className="h-4 w-4" /> Copiar link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onWhatsApp}>
                <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={buildPublicUrl(row.public_token)} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" /> Abrir formulário
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AdminMenuItems onEdit={onEdit} onRegenerate={onRegenerate} onDuplicate={onDuplicate} onDelete={onDelete} />
              <DropdownMenuSeparator />
              <DeleteMenuItem onDelete={onDelete} />
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <TypeBadges row={row} />
      <div className="flex gap-1.5 pt-1">
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={onCopy}>
          <Copy className="h-3.5 w-3.5" /> Copiar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 text-emerald-700 hover:text-emerald-700 hover:bg-emerald-50"
          onClick={onWhatsApp}
        >
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </Button>
      </div>
    </CardShell>
  );
}

function InProgressCard({
  row,
  selected,
  onToggleSelect,
  onCopy,
  onWhatsApp,
  onView,
  onEdit,
  onRegenerate,
  onDuplicate,
  onDelete,
}: {
  row: Row;
  selected?: boolean;
  onToggleSelect?: () => void;
  onCopy: () => void;
  onWhatsApp: () => void;
  onView: () => void;
} & AdminActions) {
  return (
    <CardShell selected={selected}>
      <CardHeader
        row={row}
        selected={selected}
        onToggleSelect={onToggleSelect}

        menu={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <Eye className="h-4 w-4" /> Ver progresso
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCopy}>
                <Copy className="h-4 w-4" /> Copiar link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onWhatsApp}>
                <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AdminMenuItems onEdit={onEdit} onRegenerate={onRegenerate} onDuplicate={onDuplicate} onDelete={onDelete} />
              <DropdownMenuSeparator />
              <DeleteMenuItem onDelete={onDelete} />
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <TypeBadges row={row} />
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" /> Atualizado {fmtDateTime(row.updated_at)}
        </span>
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5" onClick={onView}>
          <Eye className="h-3.5 w-3.5" /> Ver
        </Button>
      </div>
    </CardShell>
  );
}

function DoneCard({
  row,
  selected,
  onToggleSelect,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  row: Row;
  selected?: boolean;
  onToggleSelect?: () => void;
  onView: () => void;
} & Omit<AdminActions, "onRegenerate">) {
  return (
    <CardShell selected={selected}>
      <CardHeader
        row={row}
        selected={selected}
        onToggleSelect={onToggleSelect}

        menu={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <Eye className="h-4 w-4" /> Ver detalhes
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AdminMenuItems onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
              <DropdownMenuSeparator />
              <DeleteMenuItem onDelete={onDelete} />
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <TypeBadges row={row} />
      <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1">
        <div className="inline-flex items-center gap-1">
          <Check className="h-3 w-3 text-emerald-600" /> Concluído em {fmtDateTime(row.updated_at)}
        </div>
      </div>
      <Button variant="default" size="sm" className="w-full gap-1.5" onClick={onView}>
        <Eye className="h-3.5 w-3.5" /> Ver detalhes
      </Button>
    </CardShell>
  );
}

function DeleteMenuItem({ onDelete }: { onDelete: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" /> Excluir
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir parametrização?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O link ficará inválido.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type FormData = Record<string, any>;

const MODULE_LABELS: Record<string, string> = {
  nfe: "NF-e",
  nfce: "NFC-e",
  nfse: "NFS-e",
  mdfe: "MDF-e",
  cte: "CT-e",
  boleto: "Boleto",
};

const MODULE_ICONS: Record<string, LucideIcon> = {
  boleto: CreditCard,
};

function FormDataViewer({ data, formTypes, clientName }: { data: FormData; formTypes: FormType[]; clientName?: string }) {
  // eslint-disable-next-line no-console
  console.log("[FormDataViewer] form_data:", data);

  // New nested structure with legacy fallback
  const empresa = data?.empresa_global ?? data ?? {};
  const modulos = data?.modulos ?? {};
  const signature = (data?.signature_metadata ?? data?.compliance) as
    | { signer_name?: string; signer_cpf?: string; signed_at?: string; ip?: string; user_agent?: string }
    | undefined;
  const hasSignature = !!(signature && (signature.signer_name || signature.signer_cpf || signature.signed_at));

  // Detect which modules have data (or are at least selected in form_types)
  const rawModsSel = data?.modules_selected;
  const modsSelArray = Array.isArray(rawModsSel)
    ? rawModsSel
    : rawModsSel && typeof rawModsSel === "object"
    ? Object.keys(rawModsSel).filter((k) => (rawModsSel as any)[k])
    : [];
  const selected = (Array.isArray(formTypes) && formTypes.length > 0
    ? formTypes
    : modsSelArray) as string[];

  const moduleKeys = Array.from(
    new Set([
      ...selected,
      ...Object.keys(modulos).filter((k) => modulos[k] && Object.keys(modulos[k]).length > 0),
    ]),
  ).filter((k) => MODULE_LABELS[k]);

  const hasArquivos = Array.isArray(data?.arquivos) && data.arquivos.length > 0;
  const hasObs = !!data?.observacoes;

  const empresaItems = [
    { label: "Razão Social", value: empresa?.razao_social ?? empresa?.nome_empresarial ?? data?.client_name },
    { label: "Nome Fantasia", value: empresa?.nome_fantasia },
    { label: "CNPJ / CPF", value: empresa?.cnpj_cpf ?? empresa?.cnpj ?? empresa?.cpf_cnpj },
    { label: "Regime tributário", value: regimeLabel(empresa?.regime ?? data?.regime ?? modulos?.nfe?.regime ?? data?.nfe_data?.regime) },
    { label: "Atividade principal", value: empresa?.atividade ?? empresa?.atividade_principal },
    { label: "CNAE principal", value: empresa?.cnae_principal ?? empresa?.cnae },
    { label: "Inscrição Estadual", value: empresa?.inscricao_estadual ?? empresa?.ie },
    { label: "Inscrição Municipal", value: empresa?.inscricao_municipal ?? empresa?.im },
    { label: "E-mail", value: empresa?.email ?? empresa?.contador_email },
    { label: "Telefone", value: empresa?.telefone ?? empresa?.contador_telefone },
    { label: "Endereço", value: empresa?.endereco ?? empresa?.logradouro },
    { label: "Município / UF", value: [empresa?.municipio, empresa?.uf].filter(Boolean).join(" / ") || undefined },
    { label: "CEP", value: empresa?.cep },
  ];

  const contadorItems = [
    { label: "Telefone / WhatsApp (Contador)", value: empresa?.contador_telefone ?? data?.contador_telefone },
    { label: "Nome do contador", value: empresa?.contador_nome ?? data?.contador_nome },
    { label: "E-mail", value: empresa?.contador_email ?? data?.contador_email },
  ];

  const certFile = (empresa?.certificado_arquivo ?? data?.certificado_arquivo ?? modulos?.nfe?.certificado_arquivo ?? data?.nfe_data?.certificado_arquivo) as
    | { name?: string; size?: number; path?: string }
    | undefined;
  const certSenha = empresa?.certificado_senha ?? data?.certificado_senha ?? modulos?.nfe?.certificado_senha ?? data?.nfe_data?.certificado_senha;
  const certificadoItems = [
    { label: "Tipo de certificado", value: empresa?.certificado_tipo ?? data?.certificado_tipo ?? "A1 (.pfx)", badge: true },
    { label: "Validade", value: empresa?.certificado_validade },
    { label: "Titular", value: empresa?.certificado_titular },
    { label: "Arquivo enviado", value: certFile?.name },
    {
      label: "Tamanho",
      value: certFile?.size ? `${Math.round(certFile.size / 1024)} KB` : undefined,
    },
  ];

  const hasValue = (v: any) => v !== null && v !== undefined && v !== "";
  const sections: {
    key: string;
    label: string;
    icon: LucideIcon;
    items: { label: string; value?: any; badge?: boolean }[];
    extra?: ReactNode;
  }[] = [
    { key: "empresa", label: "Empresa", icon: Building2, items: empresaItems },
    { key: "contador", label: "Contador", icon: User, items: contadorItems },
    {
      key: "certificado",
      label: "Certificado",
      icon: FileSignature,
      items: certificadoItems,
      extra: <CertificateBox file={certFile} senha={certSenha} />,
    },
  ].filter(
    (s) =>
      s.items.some((it) => hasValue(it.value)) ||
      (s.key === "certificado" && (!!certFile?.path || hasValue(certSenha))),
  );

  const visibleModules = moduleKeys.filter((k) => {
    const m = modulos?.[k] ?? data?.[`${k}_data`] ?? {};
    return Object.values(m).some(hasValue);
  });

  const firstTab =
    sections[0]?.key ?? (visibleModules[0] ? `mod-${visibleModules[0]}` : hasArquivos ? "arquivos" : hasObs ? "obs" : hasSignature ? "assinatura" : "empresa");

  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(printRef.current, {
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
      console.error("[admin downloadPdf] failed:", err);
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setDownloading(false);
    }
  }

  if (sections.length === 0 && visibleModules.length === 0 && !hasArquivos && !hasObs && !hasSignature) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm italic text-muted-foreground/70">
        Nenhuma informação preenchida nesta parametrização.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex justify-end mb-2">
        <Button size="sm" onClick={downloadPdf} disabled={downloading} className="gap-2">
          {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Baixar Comprovante (PDF)
        </Button>
      </div>
      <Tabs defaultValue={firstTab} className="flex-1 overflow-hidden flex flex-col">
        <TabsList className="flex flex-wrap h-auto justify-start">
          {sections.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.key} value={t.key} className="gap-1.5 py-2 text-xs">
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            );
          })}
          {visibleModules.map((k) => {
            const ModIcon = MODULE_ICONS[k] ?? Receipt;
            return (
              <TabsTrigger key={k} value={`mod-${k}`} className="gap-1.5 py-2 text-xs">
                <ModIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{MODULE_LABELS[k]}</span>
              </TabsTrigger>
            );
          })}
          {hasArquivos && (
            <TabsTrigger value="arquivos" className="gap-1.5 py-2 text-xs">
              <FolderOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Arquivos</span>
            </TabsTrigger>
          )}
          {hasObs && (
            <TabsTrigger value="obs" className="gap-1.5 py-2 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Observações</span>
            </TabsTrigger>
          )}
          {hasSignature && (
            <TabsTrigger value="assinatura" className="gap-1.5 py-2 text-xs">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Assinatura</span>
            </TabsTrigger>
          )}
        </TabsList>

        <div className="overflow-y-auto mt-2 pr-1">
          {sections.map((s) => (
            <TabsContent key={s.key} value={s.key} className="mt-0 space-y-3">
              <FieldGrid items={s.items} />
              {s.extra}
            </TabsContent>
          ))}

          {visibleModules.map((k) => {
            const m = modulos?.[k] ?? {};
            return (
              <TabsContent key={k} value={`mod-${k}`} className="mt-0">
                <ModuleDetails moduleKey={k} data={m} />
              </TabsContent>
            );
          })}

          {hasArquivos && (
            <TabsContent value="arquivos" className="mt-0">
              <FilesList files={data?.arquivos} />
            </TabsContent>
          )}

          {hasObs && (
            <TabsContent value="obs" className="mt-0">
              <div className="rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap min-h-24">
                {data.observacoes}
              </div>
            </TabsContent>
          )}

          {hasSignature && (
            <TabsContent value="assinatura" className="mt-0">
              <SignatureReceipt sig={signature!} />
            </TabsContent>
          )}
        </div>
      </Tabs>

      {/* Off-screen printable full view for PDF export */}
      <div
        aria-hidden
        style={{ position: "fixed", left: "-99999px", top: 0, width: "800px", background: "#fff" }}
      >
        <div ref={printRef} className="p-6 space-y-5 bg-white text-foreground">
          <div className="border-b pb-3">
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              Comprovante · Certifica+ Parametrização Fiscal
            </p>
            <h2 className="text-xl font-bold mt-1">{clientName || "Cliente"}</h2>
          </div>
          {sections.map((s) => (
            <div key={s.key}>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <s.icon className="h-3.5 w-3.5" /> {s.label}
              </h3>
              <FieldGrid items={s.items} />
            </div>
          ))}
          {visibleModules.map((k) => {
            const m = modulos?.[k] ?? {};
            return (
              <div key={k}>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  {(() => { const I = MODULE_ICONS[k] ?? Receipt; return <I className="h-3.5 w-3.5" />; })()} {MODULE_LABELS[k]}
                </h3>
                <ModuleDetails moduleKey={k} data={m} />
              </div>
            );
          })}
          {hasArquivos && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Arquivos</h3>
              <FilesList files={data?.arquivos} />
            </div>
          )}
          {hasObs && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Observações</h3>
              <div className="rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                {data.observacoes}
              </div>
            </div>
          )}
          {hasSignature && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" /> Assinatura Eletrônica
              </h3>
              <SignatureReceipt sig={signature!} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CertificateBox({
  file,
  senha,
}: {
  file?: { name?: string; size?: number; path?: string };
  senha?: string;
}) {
  const getUrl = useServerFn(getCertificateDownloadUrl);
  const [loading, setLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  async function download() {
    if (!file?.path) return;
    setLoading(true);
    try {
      const { url } = await getUrl({ data: { path: file.path } });
      window.open(url, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível gerar o link de download.");
    } finally {
      setLoading(false);
    }
  }

  if (!file?.path && !senha) return null;

  return (
    <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Certificado Digital A1</h4>
      </div>
      {file?.path ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm truncate flex-1 min-w-40">{file.name ?? "certificado.pfx"}</span>
          <Button size="sm" onClick={download} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Baixar certificado
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {file?.name
            ? `Arquivo informado (${file.name}), mas enviado antes do armazenamento seguro — solicite o reenvio ao cliente.`
            : "Nenhum arquivo de certificado enviado."}
        </p>
      )}
      {senha && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Senha:</span>
          <code className="text-sm font-mono">{showSenha ? senha : "••••••••"}</code>
          <Button size="sm" variant="ghost" onClick={() => setShowSenha((v) => !v)}>
            {showSenha ? "Ocultar" : "Mostrar"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              navigator.clipboard.writeText(senha);
              toast.success("Senha copiada");
            }}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        O link de download é assinado e expira em 5 minutos. Uso restrito a administradores.
      </p>
    </div>
  );
}

function SignatureReceipt({
  sig,
}: {
  sig: { signer_name?: string; signer_cpf?: string; signed_at?: string; ip?: string; user_agent?: string };
}) {
  const signedAt = sig.signed_at ? new Date(sig.signed_at).toLocaleString("pt-BR") : undefined;
  return (
    <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-4 md:p-5 space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-emerald-200/70">
        <ShieldCheck className="h-4 w-4 text-emerald-700" />
        <h4 className="text-sm font-bold text-emerald-900">Recibo de Assinatura Eletrônica</h4>
      </div>
      <FieldGrid
        items={[
          { label: "Nome do responsável", value: sig.signer_name },
          { label: "CPF do responsável", value: sig.signer_cpf },
          { label: "Data e hora do envio", value: signedAt },
          { label: "Endereço IP", value: sig.ip },
          { label: "User agent", value: sig.user_agent },
        ]}
      />
      <div className="flex items-center gap-2 pt-2 border-t border-emerald-200/70">
        <Check className="h-4 w-4 text-emerald-700" />
        <span className="text-sm font-semibold text-emerald-800">
          Assinado Eletronicamente (Válido)
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Registro eletrônico com validade jurídica nos termos da Lei nº 14.063/2020.
      </p>
    </div>
  );
}


function ModuleDetails({ moduleKey, data }: { moduleKey: string; data: FormData }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm italic text-muted-foreground/70">
        Nenhum dado preenchido para {MODULE_LABELS[moduleKey] ?? moduleKey}.
      </div>
    );
  }
  const hasValue = (v: any) => v !== null && v !== undefined && v !== "";

  // Caso especial NF-e: extrai a lista de regras fiscais e renderiza cada uma em um bloco.
  if (moduleKey === "nfe" && Array.isArray(data.nfe_rules) && data.nfe_rules.length > 0) {
    const { nfe_rules, ...rest } = data;
    const baseEntries = Object.entries(rest).filter(([, v]) => hasValue(v));
    return (
      <div className="space-y-4">
        {baseEntries.length > 0 && (
          <FieldGrid
            items={baseEntries.map(([k, v]) => ({
              label: humanize(k),
              value: typeof v === "object" ? JSON.stringify(v) : v,
            }))}
          />
        )}
        {(nfe_rules as any[]).map((rule, idx) => {
          const { id: _id, nome, ...fields } = rule ?? {};
          const items = Object.entries(fields)
            .filter(([, v]) => hasValue(v))
            .map(([k, v]) => ({
              label: humanize(k),
              value: typeof v === "object" ? JSON.stringify(v) : v,
            }));
          return (
            <div key={rule?.id ?? idx} className="rounded-lg border bg-card">
              <div className="border-b px-4 py-2.5 flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                  Regra {idx + 1}
                </span>
                <span className="text-sm font-semibold">{nome || "Sem nome"}</span>
              </div>
              <div className="p-3">
                {items.length > 0 ? (
                  <FieldGrid items={items} />
                ) : (
                  <p className="text-xs italic text-muted-foreground/70">Regra sem dados preenchidos.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (moduleKey === "boleto") {
    return <BoletoDetails data={data} />;
  }

  const entries = Object.entries(data).filter(([, v]) => hasValue(v));
  return (
    <FieldGrid
      items={entries.map(([k, v]) => ({
        label: humanize(k),
        value: typeof v === "object" ? (Array.isArray(v) ? v.join("; ") : JSON.stringify(v)) : v,
      }))}
    />
  );
}

const BANCO_LABELS: Record<string, string> = {
  "001": "001 — Banco do Brasil",
  "237": "237 — Bradesco",
  "341": "341 — Itaú Unibanco",
  "033": "033 — Santander",
  "104": "104 — Caixa Econômica Federal",
  "756": "756 — Sicoob",
  "748": "748 — Sicredi",
};

const TIPO_CONTA_LABELS: Record<string, string> = {
  corrente: "Conta Corrente",
  poupanca: "Conta Poupança",
};

const ESPECIE_LABELS: Record<string, string> = {
  DM: "DM — Duplicata Mercantil",
  DS: "DS — Duplicata de Serviço",
  NP: "NP — Nota Promissória",
  RC: "RC — Recibo",
  OU: "OU — Outros",
};

function BoletoDetails({ data }: { data: FormData }) {
  const bancoCode = String(data?.banco ?? "");
  const isSicoob = bancoCode === "756";
  const bancosComRemessa = ["748", "237", "104"];
  const bancosComDensidade = ["033", "237"];
  const showRemessa = bancosComRemessa.includes(bancoCode);
  const showDensidade = bancosComDensidade.includes(bancoCode);

  const agenciaFmt = [data?.agencia, data?.agencia_digito].filter(Boolean).join("-");
  const contaFmt = [data?.conta, data?.conta_digito].filter(Boolean).join("-");

  const bancarios = [
    { label: "Banco", value: BANCO_LABELS[bancoCode] ?? data?.banco, badge: true },
    { label: "Tipo de Conta", value: TIPO_CONTA_LABELS[String(data?.tipo_conta ?? "")] ?? data?.tipo_conta },
    { label: "Agência", value: agenciaFmt || undefined },
    { label: "Conta", value: contaFmt || undefined },
    { label: "Código do Beneficiário / Empresa", value: data?.codigo_beneficiario },
    { label: "Convênio", value: data?.convenio },
    { label: "Carteira", value: data?.carteira },
  ];

  const integracao = [
    { label: "Padrão CNAB", value: data?.cnab ? `CNAB ${data.cnab}` : undefined, badge: true },
    { label: "Espécie do Documento", value: ESPECIE_LABELS[String(data?.especie_documento ?? "")] ?? data?.especie_documento },
  ];

  const remessa = [
    showRemessa ? { label: "Número da Remessa", value: data?.numero_remessa } : null,
    showDensidade ? { label: "Densidade da Remessa", value: data?.densidade_remessa ? `${data.densidade_remessa} BPI` : undefined } : null,
  ].filter(Boolean) as { label: string; value?: any }[];

  const sicoob = [
    { label: "Client ID", value: data?.sicoob_client_id },
    { label: "Usuário Portal Developer", value: data?.sicoob_usuario_dev },
    { label: "Senha Portal Developer", value: data?.sicoob_senha_dev ? "••••••••" : undefined },
  ];

  const numeracao = [
    { label: "Último Nº de Boleto (Nosso Número)", value: data?.ultimo_nosso_numero, badge: true },
    { label: "Multa (%)", value: data?.multa_percent },
    { label: "Juros (% ao mês)", value: data?.juros_percent_mes },
    { label: "Protesto (dias úteis)", value: data?.protesto_dias },
  ];

  const anexo = data?.boleto_referencia as { name?: string; size?: number } | undefined;
  const hasValue = (v: any) => v !== null && v !== undefined && v !== "";

  return (
    <div className="space-y-4">
      <BoletoBlock title="Dados Bancários" icon={Landmark} items={bancarios} />

      {(integracao.some((i) => hasValue(i.value)) || remessa.some((i) => hasValue(i.value)) || (isSicoob && sicoob.some((i) => hasValue(i.value)))) && (
        <div className="space-y-3">
          <BoletoBlock title="Integração e Remessa" icon={FileText} items={[...integracao, ...remessa]} />
          {isSicoob && sicoob.some((i) => hasValue(i.value)) && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-primary">
                  Credenciais Sicoob (Portal Developer)
                </span>
              </div>
              <FieldGrid items={sicoob} />
            </div>
          )}
        </div>
      )}

      <BoletoBlock title="Numeração e Instruções" icon={Receipt} items={numeracao} />

      {data?.instrucoes_juros_desconto && (
        <div className="rounded-lg border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
            Regras de Juros, Descontos e Multa (Observações)
          </p>
          <p className="text-sm whitespace-pre-wrap break-words">{data.instrucoes_juros_desconto}</p>
        </div>
      )}

      {anexo?.name && (
        <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-2 text-sm">
          <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium truncate">{anexo.name}</span>
          {typeof anexo.size === "number" && (
            <span className="text-xs text-muted-foreground shrink-0">{formatBytes(anexo.size)}</span>
          )}
        </div>
      )}
    </div>
  );
}

function BoletoBlock({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: LucideIcon;
  items: { label: string; value?: any; badge?: boolean }[];
}) {
  const visible = items.filter((it) => it.value !== null && it.value !== undefined && it.value !== "");
  if (visible.length === 0) return null;
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-2.5 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="p-3">
        <FieldGrid items={visible} />
      </div>
    </div>
  );
}



const HUMAN_LABELS: Record<string, string> = {
  nfce_csc_id: "ID do Token CSC (cIdToken)",
  nfce_csc_codigo: "Código / Chave CSC",
  nfce_csc_ambiente: "Ambiente do CSC",
  nfce_ultima_nfe: "Última NFC-e Emitida",
  nfce_serie: "Série da NFC-e",
  nfce_csosn: "CSOSN Padrão NFC-e",
  nfce_cst: "CST ICMS Padrão NFC-e",
  nfce_cfop: "CFOP Padrão NFC-e (Saída)",
  nfce_cfop_entrada: "CFOP de Entrada / Devolução NFC-e",
  nfce_aliquota_icms: "Alíquota ICMS NFC-e (%)",
  nfce_substituicao_tributaria: "Substituição Tributária (ICMS-ST)",
  nfce_valor_icms_st: "Valor / Alíquota ICMS-ST NFC-e",
  nfce_msg_cupom: "Mensagem de Rodapé do Cupom (IBPT)",
  ultima_nfe: "Última NF-e Emitida",
  serie_nfe: "Série da NF-e",
  regime: "Regime Tributário",
  cfop_estadual: "CFOP de Saída Estadual",
  cfop_interestadual: "CFOP de Saída Interestadual (Contribuinte)",
  cfop_nao_contrib_interestadual: "CFOP de Saída Interestadual (Não Contribuinte)",
  cfop_entrada_estadual: "CFOP de Entrada Estadual",
  cfop_entrada_interestadual: "CFOP de Entrada Interestadual",
  cfop_entrada: "CFOP de Entrada de Nota",
  cfop: "CFOP de Prestação (Contribuinte)",
  cfop_nao_contrib: "CFOP de Prestação (Não Contribuinte)",
  codigo_cfop: "CFOP de Prestação de Serviço (Saída)",
  mdfe_cfop: "CFOP Padrão MDF-e (Transporte)",
  mdfe_cfop_entrada: "CFOP de Entrada MDF-e",
  cst_cbs: "CST CBS/IBS",
  aliquota_cbs: "Alíquota CBS (%)",
  cst_ibs: "CST IBS",
  aliquota_ibs: "Alíquota IBS (%)",
  c_class_trib: "Classificação Tributária",
  observacoes: "Considerações Finais",
};

function humanize(key: string) {
  if (HUMAN_LABELS[key]) return HUMAN_LABELS[key];
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function regimeLabel(v?: string) {
  if (v === "simples") return "Simples Nacional";
  if (v === "presumido") return "Lucro Presumido";
  if (v === "real") return "Lucro Real";
  return v;
}

function FieldGrid({
  items,
}: {
  items: { label: string; value?: any; yesNo?: boolean; badge?: boolean }[];
}) {
  const visible = items.filter(
    (it) => it.value !== null && it.value !== undefined && it.value !== "",
  );
  if (visible.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {visible.map((it) => (
        <div key={it.label} className="rounded-md border bg-card px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-0.5">
            {it.label}
          </p>
          <FieldValue {...it} />
        </div>
      ))}
    </div>
  );
}

function FieldValue({ value, yesNo, badge }: { value?: any; yesNo?: boolean; badge?: boolean }) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (yesNo) {
    const yes = String(value).toLowerCase() === "sim";
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-sm font-medium ${
          yes ? "text-emerald-700" : "text-rose-700"
        }`}
      >
        {yes ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
        {yes ? "Sim" : "Não"}
      </span>
    );
  }
  if (badge) {
    return (
      <Badge variant="secondary" className="font-mono">
        {String(value)}
      </Badge>
    );
  }
  return <p className="text-sm font-medium break-words">{String(value)}</p>;
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function FilesList({ files }: { files?: { name: string; size: number; url?: string }[] }) {
  if (!files || files.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center">
        <FolderOpen className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="italic text-muted-foreground/70 text-sm">Nenhum arquivo anexado</p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {files.map((f, i) => (
        <li key={i} className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Paperclip className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{f.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(f.size)}</p>
          </div>
          {f.url ? (
            <Button variant="outline" size="sm" asChild className="gap-1.5 shrink-0">
              <a href={f.url} target="_blank" rel="noreferrer">
                <Download className="h-3.5 w-3.5" /> Abrir
              </a>
            </Button>
          ) : (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              sem URL
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "concluido") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
        Concluído
      </Badge>
    );
  }
  if (status === "em_andamento") {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
        Em Andamento
      </Badge>
    );
  }
  return (
    <Badge className="bg-muted text-muted-foreground border-border hover:bg-muted">Pendente</Badge>
  );
}

type EditPatch = {
  client_name?: string;
  form_types?: FormType[];
  status?: "pendente" | "em_andamento" | "concluido";
  form_data?: Record<string, any>;
};

function EditParameterizationDialog({
  row,
  onClose,
  onSave,
}: {
  row: Row | null;
  onClose: () => void;
  onSave: (patch: EditPatch) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [types, setTypes] = useState<FormType[]>([]);
  const [status, setStatus] = useState<"pendente" | "em_andamento" | "concluido">("pendente");
  const [jsonText, setJsonText] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (!row) return;
    setName(row.client_name);
    setTypes((row.form_types && row.form_types.length > 0 ? row.form_types : [row.form_type]) as FormType[]);
    setStatus((row.status as any) ?? "pendente");
    try {
      setJsonText(JSON.stringify(row.form_data ?? {}, null, 2));
    } catch {
      setJsonText("{}");
    }
    setJsonError(null);
  }, [row]);

  function toggle(t: FormType) {
    setTypes((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  }

  async function save() {
    let parsed: any = undefined;
    if (jsonText.trim()) {
      try {
        parsed = JSON.parse(jsonText);
        if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
          throw new Error("Deve ser um objeto JSON.");
        }
      } catch (e: any) {
        setJsonError(e?.message ?? "JSON inválido");
        return;
      }
    }
    if (!name.trim()) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }
    if (types.length === 0) {
      toast.error("Selecione ao menos um módulo");
      return;
    }
    await onSave({
      client_name: name.trim(),
      form_types: types,
      status,
      form_data: parsed,
    });
  }

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl sm:max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar cadastro</DialogTitle>
          <DialogDescription>
            Ajuste nome, módulos, status ou os dados preenchidos pelo contador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do cliente</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Módulos</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {(Object.keys(TYPE_LABELS) as FormType[]).map((t) => {
                const selected = types.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggle(t)}
                    className={`relative text-left rounded-lg border-2 p-2.5 text-sm transition ${
                      selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    {selected && <Check className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-primary" />}
                    <span className="font-semibold">{TYPE_LABELS[t]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Aguardando Contador</SelectItem>
                <SelectItem value="em_andamento">Em Preenchimento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Dados do formulário (JSON)</Label>
            <p className="text-xs text-muted-foreground">
              Edite com cuidado. Você pode adicionar/remover campos ou módulos diretamente neste objeto.
            </p>
            <Textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setJsonError(null);
              }}
              rows={14}
              className="font-mono text-xs"
            />
            {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>Salvar alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
