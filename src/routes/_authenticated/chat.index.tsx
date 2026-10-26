import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

import { createThread } from "@/lib/threads.functions";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatIndex,
});

function ChatIndex() {
  const navigate = useNavigate();
  const newThread = useServerFn(createThread);
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    let visitorId = typeof window !== "undefined" ? localStorage.getItem("visitor_id") : "";
    if (!visitorId) {
      visitorId = "visitor-" + Math.random().toString(36).substring(2, 10);
      localStorage.setItem("visitor_id", visitorId);
    }
    const visitorJson = typeof window !== "undefined" ? localStorage.getItem("visitor_info") : null;
    let visitor: any = {};
    try {
      if (visitorJson) visitor = JSON.parse(visitorJson);
    } catch {}

    newThread({
      data: {
        visitorId,
        visitorName: visitor.name || "Visitante",
        visitorEmail: visitor.email,
        visitorPhone: visitor.phone,
        visitorDocument: visitor.document,
      },
    })
      .then(({ id }) => {
        navigate({ to: "/chat/$threadId", params: { threadId: id }, replace: true });
      })
      .catch((err: Error) => {
        const msg = err?.message || "Erro ao iniciar conversa";
        console.error("[chat.index] createThread failed:", err);
        toast.error(msg);
        setError(msg);
      });
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start();
  }, []);

  return (
    <div className="flex flex-col h-full items-center justify-center gap-3 text-muted-foreground p-4">
      {error ? (
        <div className="flex flex-col items-center gap-3 max-w-sm text-center">
          <p className="text-sm text-destructive font-medium">Erro ao carregar conversa: {error}</p>
          <Button onClick={start} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm">Iniciando atendimento inteligente...</p>
        </div>
      )}
    </div>
  );
}
