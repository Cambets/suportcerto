import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Book } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KnowledgeCard } from "@/components/knowledge/knowledge-card";
import { KnowledgeForm } from "@/components/knowledge/knowledge-form";
import { useKnowledge } from "@/hooks/use-knowledge";

export const Route = createFileRoute("/_authenticated/conhecimento")({
  component: KnowledgePage,
});

function KnowledgePage() {
  const {
    entries,
    isLoading,
    search,
    setSearch,
    isAdding,
    setIsAdding,
    editingId,
    loading,
    form,
    handleSave,
    handleDelete,
    startEdit,
    resetForm,
  } = useKnowledge();

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden animate-in fade-in duration-500">
      <header className="bg-card/50 backdrop-blur-md border-b px-8 py-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Book className="h-6 w-6 text-primary" />
            </div>
            Base de Conhecimento
          </h1>
          <p className="text-sm text-muted-foreground">
            Alimente o cérebro do seu assistente com dados exclusivos da sua unidade.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsAdding(true); }} className="gap-2 shadow-sm hover:shadow-md transition-all">
          <Plus className="h-4 w-4" /> Adicionar Entrada
        </Button>
      </header>

      <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="relative group max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Pesquisar por produtos, processos ou termos técnicos..."
              className="pl-12 h-12 text-base rounded-xl bg-card border shadow-sm focus-visible:ring-primary/20 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-card animate-pulse h-48 rounded-xl border" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-32 bg-card/30 rounded-3xl border border-dashed border-muted-foreground/20">
              <div className="bg-muted/30 p-4 rounded-full w-fit mx-auto mb-4">
                <Book className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <h3 className="text-xl font-semibold">Nenhuma entrada encontrada</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                {search ? "Tente buscar por outros termos ou categorias." : "Comece a organizar seu conhecimento corporativo agora mesmo."}
              </p>
              {!search && (
                <Button variant="outline" onClick={() => setIsAdding(true)} className="mt-6">
                  Adicionar primeira entrada
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
              {entries.map((entry: any) => (
                <KnowledgeCard 
                  key={entry.id} 
                  entry={entry} 
                  onEdit={startEdit} 
                  onDelete={handleDelete} 
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <KnowledgeForm 
        open={isAdding}
        onOpenChange={setIsAdding}
        title={form.title}
        setTitle={form.setTitle}
        content={form.content}
        setContent={form.setContent}
        tags={form.tags}
        setTags={form.setTags}
        loading={loading}
        onSave={handleSave}
        isEditing={!!editingId}
      />
    </div>
  );
}


