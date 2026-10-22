import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listKnowledge, upsertKnowledge, deleteKnowledge } from "@/lib/knowledge.functions";
import { KnowledgeEntry } from "@/types/knowledge";

export function useKnowledge() {
  const qc = useQueryClient();
  const fetchKnowledgeFn = useServerFn(listKnowledge);
  const saveKnowledgeFn = useServerFn(upsertKnowledge);
  const removeKnowledgeFn = useServerFn(deleteKnowledge);

  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["knowledge"],
    queryFn: () => fetchKnowledgeFn(),
  });

  const filteredEntries = useMemo(() => {
    const term = search.toLowerCase();
    return entries.filter(
      (e: KnowledgeEntry) =>
        e.title.toLowerCase().includes(term) ||
        e.content.toLowerCase().includes(term) ||
        e.tags?.some((t: string) => t.toLowerCase().includes(term)),
    );
  }, [entries, search]);

  function resetForm() {
    setIsAdding(false);
    setEditingId(null);
    setTitle("");
    setContent("");
    setTags("");
  }

  function startEdit(entry: KnowledgeEntry) {
    setEditingId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setTags(entry.tags?.join(", ") || "");
    setIsAdding(true);
  }

  async function handleSave() {
    if (!title || !content) {
      toast.error("Título e conteúdo são obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      await saveKnowledgeFn({
        data: {
          id: editingId || undefined,
          title,
          content,
          tags: tagList,
        },
      });
      qc.invalidateQueries({ queryKey: ["knowledge"] });
      toast.success(editingId ? "Atualizado com sucesso" : "Adicionado com sucesso");
      resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta entrada?")) return;
    try {
      await removeKnowledgeFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["knowledge"] });
      toast.success("Excluído com sucesso");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  return {
    entries: filteredEntries,
    isLoading,
    search,
    setSearch,
    isAdding,
    setIsAdding,
    editingId,
    loading,
    form: {
      title,
      setTitle,
      content,
      setContent,
      tags,
      setTags,
    },
    handleSave,
    handleDelete,
    startEdit,
    resetForm,
  };
}
