import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { ChatWindow } from "@/components/chat-window";
import { getThread } from "@/lib/threads.functions";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ChatThreadPage,
});

function ChatThreadPage() {
  const { threadId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchThread = useServerFn(getThread);

  const { data, isLoading } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => {
      const visitorId = typeof window !== "undefined" ? localStorage.getItem("visitor_id") || "" : "";
      return fetchThread({ data: { threadId, visitorId } });
    },
    retry: false,
  });

  const missing = !isLoading && data != null && data.thread == null;

  useEffect(() => {
    if (missing) {
      qc.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/chat", replace: true });
    }
  }, [missing, navigate, qc]);

  if (isLoading || !data || missing) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <ChatWindow
      key={threadId}
      threadId={threadId}
      initialMessages={data.messages}
      onUpdated={() => qc.invalidateQueries({ queryKey: ["threads"] })}
    />
  );
}

