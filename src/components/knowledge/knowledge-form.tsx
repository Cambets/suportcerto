import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface KnowledgeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  setTitle: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
  tags: string;
  setTags: (v: string) => void;
  loading: boolean;
  onSave: () => void;
  isEditing: boolean;
}

export function KnowledgeForm({
  open,
  onOpenChange,
  title,
  setTitle,
  content,
  setContent,
  tags,
  setTags,
  loading,
  onSave,
  isEditing,
}: KnowledgeFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Entrada" : "Nova Entrada de Conhecimento"}</DialogTitle>
          <DialogDescription>
            Adicione informações detalhadas sobre produtos, serviços ou processos da Certifica+.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Título</label>
            <Input
              placeholder="Ex: Como renovar certificado"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Conteúdo (Informação detalhada)</label>
            <Textarea
              placeholder="Descreva o processo ou informação aqui..."
              className="min-h-[200px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Tags (separadas por vírgula)</label>
            <Input
              placeholder="ex: renovação, certificado, suporte"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Salvar Alterações" : "Adicionar Entrada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
