import { Sparkles, MessageCircle } from "lucide-react";
import { useMemo } from "react";

interface ChatSuggestionsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
}

const WHATSAPP_NUMBER = "+55 37 9862-8259";
const WHATSAPP_BASE = "https://wa.me/553798628259";

function buildWhatsAppLink() {
  if (typeof window === "undefined") return WHATSAPP_BASE;
  try {
    const raw = localStorage.getItem("visitor_info");
    if (!raw) return WHATSAPP_BASE;
    const v = JSON.parse(raw) as { name?: string; document?: string };
    const name = v?.name?.trim();
    const doc = v?.document?.trim();
    if (!name && !doc) return WHATSAPP_BASE;
    const message =
      `Olá! Sou *${name ?? "—"}* (CPF/CNPJ: ${doc ?? "—"}).\n` +
      `Gostaria de continuar meu atendimento Certifica+ por aqui.`;
    return `${WHATSAPP_BASE}?text=${encodeURIComponent(message)}`;
  } catch {
    return WHATSAPP_BASE;
  }
}

export function ChatSuggestions({ suggestions, onSelect }: ChatSuggestionsProps) {
  const whatsappLink = useMemo(buildWhatsAppLink, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-primary/10 p-5 rounded-full mb-6">
        <Sparkles className="h-10 w-10 text-primary" />
      </div>
      <h1 className="text-3xl font-bold text-center tracking-tight mb-3">
        Consultor Certifica+ <span className="text-primary italic">Avançado</span>
      </h1>
      <p className="text-muted-foreground text-center max-w-lg mb-8 leading-relaxed">
        Olá! Sou seu parceiro estratégico para impulsionar sua unidade Certifica+. 
        Estou pronto para ajudar com dúvidas técnicas, fechamento de propostas e agendamento de demonstrações.
      </p>

      <div className="grid gap-3 w-full max-w-md mb-8">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s)}
            className="text-left px-5 py-3 rounded-xl border bg-card hover:bg-primary/5 hover:border-primary/30 transition-all text-sm font-medium shadow-sm"
          >
            {s}
          </button>
        ))}
      </div>

      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors text-sm font-semibold"
      >
        <MessageCircle className="h-4 w-4" />
        Falar no WhatsApp {WHATSAPP_NUMBER}
      </a>
    </div>
  );
}
