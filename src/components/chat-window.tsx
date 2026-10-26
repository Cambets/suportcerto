import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Send, Loader2, Mic, Square, Paperclip, X, Lightbulb, AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DefaultChatTransport } from "ai";


import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAudioTranscriber } from "@/hooks/use-audio-transcriber";
import { checkIsAdmin } from "@/lib/admin.functions";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputProvider,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";

import { MessageList } from "./chat/message-list";
import { LeadCaptureDialog } from "./chat/lead-capture-dialog";
import { useThreadDetail } from "@/hooks/use-threads";

type ChatMode = "geral" | "suporte";

interface ChatWindowProps {
  threadId: string;
  initialMessages?: any[];
  onUpdated?: () => void;
}





export function ChatWindow(props: ChatWindowProps) {
  return (
    <PromptInputProvider>
      <ChatWindowContent {...props} />
    </PromptInputProvider>
  );
}

function ChatWindowContent({ threadId, initialMessages = [], onUpdated }: ChatWindowProps) {
  const qc = useQueryClient();
  const { textInput } = usePromptInputController();

  // Role check: only admin/suporte see the "Suporte Técnico" tab
  const checkIsAdminFn = useServerFn(checkIsAdmin);
  const [canSeeSuporte, setCanSeeSuporte] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const hasLocalDev = typeof window !== "undefined" && localStorage.getItem("visitor_id") === "admin-local-dev";
    if (hasLocalDev) {
      setCanSeeSuporte(true);
      setRoleChecked(true);
      return;
    }

    if (!isSupabaseConfigured()) {
      setCanSeeSuporte(false);
      setRoleChecked(true);
      return;
    }

    supabase.auth.getUser()
      .then(async ({ data }) => {
        if (!data?.user) {
          if (!cancelled) setRoleChecked(true);
          return;
        }
        try {
          const res = await checkIsAdminFn();
          if (!cancelled) {
            setCanSeeSuporte(res.isAdmin || res.isSuporte || hasLocalDev);
            setRoleChecked(true);
          }
        } catch {
          if (!cancelled) setRoleChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) setRoleChecked(true);
      });
    return () => { cancelled = true; };
  }, [checkIsAdminFn]);

  const [mode, setMode] = useState<ChatMode>("geral");

  // Force mode updates based on role
  useEffect(() => {
    if (!roleChecked) return;
    
    // If user CAN see suporte, we might want to default to it or stay in current
    // But if they CANNOT see suporte and are somehow in it, force back to geral
    if (!canSeeSuporte && mode === "suporte") {
      setMode("geral");
    }
  }, [roleChecked, canSeeSuporte, mode]);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({
        threadId,
        visitorId: typeof window !== "undefined" ? localStorage.getItem("visitor_id") || "anonymous" : "anonymous",
      }),
      headers: async (): Promise<Record<string, string>> => {
        if (typeof window !== "undefined" && localStorage.getItem("visitor_id") === "admin-local-dev") {
          return { Authorization: "Bearer admin-local-dev" };
        }
        if (!isSupabaseConfigured()) {
          return {};
        }
        try {
          const { data } = await supabase.auth.getSession();
          const token = data?.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        } catch {
          return {};
        }
      },
    }),
    [threadId],
  );


  const {
    messages,
    sendMessage,
    status,
  } = useChat({
    id: threadId,
    messages: initialMessages.map(m => ({
      id: m.id,
      role: m.role as any,
      parts: [{ type: "text", text: m.content }],
      createdAt: new Date(m.created_at),
    })),
    transport,
    onFinish: () => {
      onUpdated?.();
      qc.invalidateQueries({ queryKey: ["thread", threadId] });
    },
    onError: (err: Error) => {
      toast.error("Erro na resposta do assistente: " + err.message);
    },
  });

  const isLoading = status !== "ready";
  const isEmpty = messages.length === 0;

  const { data: threadDetail } = useThreadDetail(threadId);
  const threadInfo = (threadDetail as any)?.thread;

  const recorder = useAudioTranscriber((text) => {
    const current = textInput.value.trim();
    const next = current ? `${current} ${text}` : text;
    textInput.setInput(next);
  });



  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    const list = Array.from(files).filter((f) => {
      if (!f.type.startsWith("image/")) {
        toast.error(`"${f.name}" não é uma imagem.`);
        return false;
      }
      if (f.size > 8 * 1024 * 1024) {
        toast.error(`"${f.name}" excede 8MB.`);
        return false;
      }
      return true;
    });
    if (list.length) setAttachments((prev) => [...prev, ...list].slice(0, 5));
  };

  const filesToFileList = (files: File[]): FileList => {
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    return dt.files;
  };

  const handleSubmit = (text: string) => {
    const hasText = text.trim().length > 0;
    if (!hasText && attachments.length === 0) return;
    sendMessage(
      {
        text: hasText ? text : "Analise o(s) print(s) de erro em anexo.",
        files: attachments.length ? filesToFileList(attachments) : undefined,
      },
      { body: { mode } },
    );
    textInput.clear();
    setAttachments([]);
  };


  return (
    <div
      className="flex flex-col h-full relative"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setIsDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setIsDragging(false);
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files?.length) {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }
        setIsDragging(false);
      }}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg pointer-events-none">
          <p className="text-primary font-medium">Solte a imagem aqui</p>
        </div>
      )}
      {threadInfo && (
        <LeadCaptureDialog
          threadId={threadId}
          contactType={threadInfo.contact_type}
          leadCompany={threadInfo.lead_company}
        />
      )}
      {canSeeSuporte && (
        <div className="border-b bg-background/70 backdrop-blur-sm px-4 py-2">
          <Tabs 
            value={mode} 
            onValueChange={(v) => {
              setMode(v as ChatMode);
            }} 

            className="max-w-3xl mx-auto"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="geral" className="gap-2 cursor-pointer transition-all">
                <Lightbulb className="h-4 w-4" />
                Dúvidas Gerais e Produtos
              </TabsTrigger>
              <TabsTrigger value="suporte" className="gap-2 cursor-pointer transition-all">
                <AlertTriangle className="h-4 w-4" />
                Suporte Técnico &amp; Erros
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}
      <Conversation className="flex-1">
        <ConversationContent>
          {isEmpty ? (
            <SupportSuggestions 
              mode={mode} 
              onSelect={(text) => handleSubmit(text)} 
            />
          ) : (
            <MessageList
              messages={messages}
              isStreaming={status === "streaming"}
              status={status}
            />
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>


      <div className="p-4 bg-background/80 backdrop-blur-sm border-t">
        <div className="max-w-3xl mx-auto">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((f, i) => (
                <div key={i} className="relative group">
                  <img
                    src={URL.createObjectURL(f)}
                    alt={f.name}
                    className="h-16 w-16 object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-90 hover:opacity-100"
                    aria-label="Remover anexo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <PromptInput
            onSubmit={({ text }) => handleSubmit(text)}
            className="bg-muted/50 border-none shadow-none focus-within:ring-1 focus-within:ring-primary/20"
          >
            <PromptInputTextarea
              placeholder="Digite sua mensagem ou anexe um print do erro da SEFAZ/ERP..."
              className="min-h-[44px] max-h-40"
            />

            <PromptInputFooter>
              <PromptInputTools>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  title="Anexar imagem (print de erro)"
                  className="h-8 w-8 rounded-full"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant={recorder.state === "recording" ? "destructive" : "ghost"}
                  onClick={recorder.toggle}
                  disabled={recorder.state === "processing"}
                  title={
                    recorder.state === "recording"
                      ? "Parar gravação"
                      : recorder.state === "processing"
                        ? "Transcrevendo..."
                        : "Gravar áudio"
                  }
                  className="h-8 w-8 rounded-full"
                >
                  {recorder.state === "processing" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : recorder.state === "recording" ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                {recorder.state === "recording" && (
                  <span className="text-xs text-destructive animate-pulse">Gravando...</span>
                )}
                {recorder.state === "processing" && (
                  <span className="text-xs text-muted-foreground">Transcrevendo áudio...</span>
                )}
              </PromptInputTools>
              <PromptInputSubmit
                disabled={isLoading || (!textInput.value.trim() && attachments.length === 0)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </PromptInputSubmit>
            </PromptInputFooter>
          </PromptInput>

          <p className="text-[10px] text-center text-muted-foreground mt-2">
            O assistente pode cometer erros. Considere verificar informações importantes.
          </p>
        </div>
      </div>
    </div>
  );
}

const SUPPORT_SUGGESTIONS: { category: string; text: string }[] = [
  { category: "SEFAZ", text: "Rejeição 202 na transmissão de NF-e: falha no schema/assinatura. Como diagnosticar?" },
  { category: "SEFAZ", text: "Rejeição 539: duplicidade de NF-e com diferença na chave de acesso. Como resolver?" },
  { category: "SEFAZ", text: "Rejeição 610: CFOP inválido para a operação. Onde ajustar no ERP?" },
  { category: "Certificado", text: "Cliente com Certificado A1 (.pfx) não autoriza notas — erro de assinatura/senha." },
  { category: "ERP", text: "Quebra/gap na sequência numérica da NF-e. Como inutilizar e regularizar?" },
  { category: "Parametrização", text: "Conflito CFOP × CSOSN × NCM na emissão. Como revisar a regra fiscal?" },
  { category: "NFC-e", text: "NFC-e rejeitada por CSC/Token inválido. Onde configurar no Caixa de Venda?" },
  { category: "MDF-e", text: "MDF-e rejeitado por CIOT/seguradora. Como corrigir os parâmetros?" },
];

const GERAL_SUGGESTIONS: { category: string; text: string }[] = [
  { category: "Certifica GED", text: "Quais são as diferenças entre os planos Básico, Intermediário e Avançado do Certifica GED?" },
  { category: "Certifica GED", text: "Qual plano do GED indicar para um escritório contábil com muitos documentos?" },
  { category: "Boletos", text: "Como funciona a transição de boletos antigos para o novo layout?" },
  { category: "Boletos", text: "Quais cuidados na virada de banco emissor de boletos?" },
  { category: "Portfólio", text: "Me explique de forma simples o que é o Certifica Concilia e para quem indicar." },
  { category: "Portfólio", text: "Qual a diferença entre Certifica ERP e Certifica Nota?" },
  { category: "Certifica Design", text: "Como funciona o Certifica Design e qual o prazo de entrega?" },
  { category: "Contratação", text: "Quais os próximos passos para contratar um produto Certifica+?" },
];

function SupportSuggestions({ mode, onSelect }: { mode: ChatMode; onSelect: (text: string) => void }) {
  const isSuporte = mode === "suporte";
  const suggestions = isSuporte ? SUPPORT_SUGGESTIONS : GERAL_SUGGESTIONS;
  const title = isSuporte ? "Suporte N2 — Certifica+" : "Dúvidas Gerais — Certifica+";
  const subtitle = isSuporte
    ? "Casos comuns de ERP / Notas Fiscais e rejeições SEFAZ. Clique para começar ou descreva seu chamado."
    : "Tire dúvidas sobre planos, produtos e regras comerciais. Clique em um exemplo ou escreva a sua pergunta.";
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 py-8 animate-in fade-in duration-500">
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">{subtitle}</p>
      <div className="grid gap-2 w-full max-w-2xl sm:grid-cols-2">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s.text)}
            className="text-left px-4 py-3 rounded-lg border bg-card hover:bg-primary/5 hover:border-primary/30 transition-all text-sm shadow-sm"
          >
            <div className="text-[10px] uppercase tracking-wide text-primary font-semibold mb-1">
              {s.category}
            </div>
            <div className="text-foreground/90 leading-snug">{s.text}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

