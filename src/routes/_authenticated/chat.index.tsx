import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { createThread } from "@/lib/threads.functions";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatIndex,
});

function ChatIndex() {
  const navigate = useNavigate();
  const newThread = useServerFn(createThread);
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const visitorJson = localStorage.getItem("visitor_info");
    const visitor = visitorJson ? JSON.parse(visitorJson) : {};
    const visitorId = localStorage.getItem("visitor_id") || "";

    newThread({
      data: {
        visitorId,
        visitorName: visitor.name,
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
  }, [navigate, newThread]);

  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      {error ? `Erro: ${error}` : "Iniciando conversa..."}
    </div>
  );
}
