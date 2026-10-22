import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoSrc from "@/assets/logo_certifica.svg";
import logoCertificaPlus from "@/assets/logo-certifica-plus.png.asset.json";

export const Route = createFileRoute("/login")({
  component: IdentificationPage,
});

function IdentificationPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const visitor = localStorage.getItem("visitor_info");
    if (visitor) {
      navigate({ to: "/chat", replace: true });
    }
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Capture UTM params from URL
      const params = new URLSearchParams(window.location.search);
      const visitorInfo = {
        name,
        document,
        email,
        phone,
        utm_source: params.get("utm_source") || undefined,
        utm_medium: params.get("utm_medium") || undefined,
        utm_campaign: params.get("utm_campaign") || undefined,
        identifiedAt: new Date().toISOString(),
      };
      localStorage.setItem("visitor_info", JSON.stringify(visitorInfo));
      localStorage.setItem("visitor_id", "anonymous-" + Math.random().toString(36).substring(2, 9));
      
      toast.success("Identificação concluída!");
      navigate({ to: "/chat", replace: true });
    } catch (err) {
      toast.error("Erro ao processar identificação");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat p-4" style={{ backgroundImage: `url(${logoCertificaPlus.url})` }}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border/40">
            <img src={logoSrc} alt="Certifica+" className="h-16 w-auto" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Atendimento Certifica+
            </h1>
            <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
              Por favor, identifique-se para iniciar o suporte com nosso Consultor Avançado.
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border shadow-xl p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome completo</Label>
              <Input 
                id="name" 
                placeholder="Seu nome"
                required 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="document">CPF ou CNPJ</Label>
              <Input 
                id="document" 
                placeholder="000.000.000-00"
                required 
                value={document} 
                onChange={(e) => setDocument(e.target.value)}
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input 
                id="email" 
                type="email"
                placeholder="seu@email.com"
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <Input 
                id="phone" 
                type="tel"
                placeholder="(00) 00000-0000"
                required 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                className="bg-muted/30"
              />
            </div>
            <Button type="submit" className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20" disabled={loading}>
              {loading ? "Processando..." : "Iniciar Atendimento"}
            </Button>
          </form>

          <div className="pt-2 border-t text-center">
            <button
              type="button"
              onClick={() => navigate({ to: "/auth" })}
              className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium cursor-pointer"
            >
              Acesso da Equipe & Parametrização &rarr;
            </button>
          </div>
        </div>
        
        <p className="text-center text-xs text-muted-foreground">
          &copy; 2026 Certifica+. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
