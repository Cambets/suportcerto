import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listThreads, createThread, deleteThread, renameThread, getThread } from "@/lib/threads.functions";
import { useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";

export function useThreads() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { threadId?: string };
  const activeId = params.threadId;
  
  const listThreadsFn = useServerFn(listThreads);
  const createThreadFn = useServerFn(createThread);
  const deleteThreadFn = useServerFn(deleteThread);
  const renameThreadFn = useServerFn(renameThread);

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["threads"],
    queryFn: async () => {
      const visitorId = localStorage.getItem("visitor_id");
      if (!visitorId) return [];
      return listThreadsFn({ data: { visitorId } });
    },
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const visitorJson = localStorage.getItem("visitor_info");
      const visitor = visitorJson ? JSON.parse(visitorJson) : {};
      const visitorId = localStorage.getItem("visitor_id") || "";
      return createThreadFn({
        data: {
          visitorId,
          visitorName: visitor.name,
          visitorEmail: visitor.email,
          visitorPhone: visitor.phone,
          visitorDocument: visitor.document,
          utmSource: visitor.utm_source,
          utmMedium: visitor.utm_medium,
          utmCampaign: visitor.utm_campaign,
        }
      });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/chat/$threadId", params: { threadId: data.id } });
    },
    onError: (error) => {
      toast.error("Erro ao criar conversa: " + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (threadId: string) =>
      deleteThreadFn({
        data: { threadId, visitorId: localStorage.getItem("visitor_id") || "" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      toast.success("Conversa excluída");
      if (activeId === activeId) {
        navigate({ to: "/" });
      }
    },
    onError: (error) => {
      toast.error("Erro ao excluir conversa: " + error.message);
    }
  });

  const renameMutation = useMutation({
    mutationFn: ({ threadId, title }: { threadId: string; title: string }) => 
      renameThreadFn({
        data: { threadId, title, visitorId: localStorage.getItem("visitor_id") || "" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["threads"] });
    },
    onError: (error) => {
      toast.error("Erro ao renomear: " + error.message);
    }
  });

  const handleNew = () => createMutation.mutate();
  const handleDelete = (threadId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (confirm("Tem certeza que deseja apagar esta conversa?")) {
      deleteMutation.mutate(threadId);
    }
  };

  return {
    threads,
    isLoading,
    activeId,
    handleNew,
    handleDelete,
    createThread: createMutation.mutate,
    isCreating: createMutation.isPending,
    deleteThread: deleteMutation.mutate,
    renameThread: renameMutation.mutate,
  };
}


export function useThreadDetail(threadId: string) {
  const getThreadFn = useServerFn(getThread);

  return useQuery({
    queryKey: ["thread", threadId],
    queryFn: () =>
      getThreadFn({
        data: { threadId, visitorId: localStorage.getItem("visitor_id") || "" },
      }),
    enabled: !!threadId,
  });
}
