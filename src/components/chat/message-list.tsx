import { type UIMessage } from "ai";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Volume2 } from "lucide-react";

interface MessageListProps {
  messages: UIMessage[];
  isStreaming?: boolean;
  status?: string;
}

const getMessageText = (m: UIMessage) =>
  m.parts?.filter((p: any) => p.type === "text").map((p: any) => p.text).join("") || "";

const getMessageFiles = (m: UIMessage) =>
  (m.parts?.filter((p: any) => p.type === "file") as any[]) || [];

export function MessageList({ messages, isStreaming, status }: MessageListProps) {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  const lastUserText = lastUserMessage ? getMessageText(lastUserMessage) : "";
  const isLikelySearchingBrand = /pesquisar|consultar|marca|inpi/i.test(lastUserText);

  return (
    <>
      {messages.map((m) => {
        const files = getMessageFiles(m);
        const text = getMessageText(m);
        return (
          <Message key={m.id} from={m.role}>
            <MessageContent>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {files.map((f, i) => {
                    const isImg = f.mediaType?.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.filename || "");
                    const isAud = f.mediaType?.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|webm|aac|flac)$/i.test(f.filename || "");
                    if (isImg) {
                      return (
                        <img
                          key={i}
                          src={f.url}
                          alt={f.filename || "anexo"}
                          className="max-h-64 rounded-lg border object-contain bg-background"
                        />
                      );
                    }
                    if (isAud) {
                      return (
                        <div key={i} className="flex flex-col gap-1.5 p-2.5 bg-muted/60 rounded-lg border max-w-sm">
                          <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                            <Volume2 className="h-4 w-4 text-primary shrink-0" />
                            <span className="truncate">{f.filename || "Áudio anexado"}</span>
                          </span>
                          <audio controls src={f.url} className="w-full h-8" />
                        </div>
                      );
                    }
                    return (
                      <a
                        key={i}
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline"
                      >
                        {f.filename || "arquivo"}
                      </a>
                    );
                  })}
                </div>
              )}
              {text && <MessageResponse>{text}</MessageResponse>}
            </MessageContent>
          </Message>
        );
      })}
      {(isStreaming || status === "submitted" || status === "loading") && (
        <Message from="assistant">
          <MessageContent>
            <Shimmer className="text-sm">
              {status === "loading" && isLikelySearchingBrand
                ? "Pesquisando marca no INPI..."
                : "Analisando..."}
            </Shimmer>
          </MessageContent>
        </Message>
      )}
    </>
  );
}
