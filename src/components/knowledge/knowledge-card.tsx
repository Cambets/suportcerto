import { Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KnowledgeEntry } from "@/types/knowledge";

interface KnowledgeCardProps {
  entry: KnowledgeEntry;
  onEdit: (entry: KnowledgeEntry) => void;
  onDelete: (id: string) => void;
}

export function KnowledgeCard({ entry, onEdit, onDelete }: KnowledgeCardProps) {
  return (
    <Card className="flex flex-col group hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-4">
          <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">
            {entry.title}
          </CardTitle>
          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(entry)}
              className="h-8 w-8"
              title="Editar"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(entry.id)}
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Excluir"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {entry.content}
        </p>
      </CardContent>
      <CardFooter className="pt-0 flex gap-2 flex-wrap">
        {entry.tags?.map((tag: string) => (
          <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-2 font-normal">
            {tag}
          </Badge>
        ))}
      </CardFooter>
    </Card>
  );
}

