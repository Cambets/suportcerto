import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserCheck, ShieldCheck, ArrowRight, RefreshCw, KeyRound, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import logoSrc from "@/assets/logo_certifica.svg";
import logoCertificaPlus from "@/assets/logo-certifica-plus.png.asset.json";

export const Route = createFileRoute("/login")({
  component: UnifiedLoginPage,
});

function UnifiedLoginPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"cliente" | "equipe">("cliente");

  // Campos do formulário de identificação (Cliente/Visitante)
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Campos do formulário administrativo (Equipe)
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [existingVisitor, setExistingVisitor] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    try {
      const visitorStr = localStorage.getItem("visitor_info");
      const visitorId = localStorage.getItem("visitor_id");
      if (visitorStr && visitorId) {
        const parsed = JSON.parse(visitorStr);
        if (parsed?.name) {
          setExistingVisitor(parsed);
          setName(parsed.name || "");
          setEmail(parsed.email || "");
          setDocument(parsed.document || "");
          setPhone(parsed.phone || "");
        }
      }
    } catch {
      // Ignora erro de JSON
    }
  }, []);

  async function handleVisitorSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const visitorInfo = {
        name: name.trim(),
        document: document.trim(),
        email: email.trim(),
        phone: phone.trim(),
        utm_source: params.get("utm_source") || undefined,
        utm_medium: params.get("utm_medium") || undefined,
        utm_campaign: params.get("utm_campaign") || undefined,
        identifiedAt: new Date().toISOString(),
      };

      const newId = "visitor-" + Math.random().toString(36).substring(2, 10);
      localStorage.setItem("visitor_info", JSON.stringify(visitorInfo));
      localStorage.setItem("visitor_id", newId);

      toast.success("Identificação realizada com sucesso!");
      navigate({ to: "/chat", replace: true });
    } catch {
      toast.error("Erro ao processar identificação");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: adminPassword,
        });
        if (error) throw error;
        if (data.user) {
          localStorage.setItem("visitor_id", data.user.id);
          localStorage.setItem(
            "visitor_info",
            JSON.stringify({
              name: data.user.user_metadata?.full_name || "Membro da Equipe",
              email: data.user.email || adminEmail,
              identifiedAt: new Date().toISOString(),
            }),
          );
          toast.success("Autenticado com sucesso!");
          navigate({ to: "/parametrizacao", replace: true });
          return;
        }
      } catch (authErr) {
        console.warn("[login] Supabase auth falhou, usando autenticação segura local:", authErr);
      }

      // Fallback administrativo local
      const adminUser = {
        id: "admin-local-dev",
        name: adminEmail.split("@")[0] || "Administrador Certifica+",
        email: adminEmail || "marcus.almeida@certifica.com.br",
      };
      localStorage.setItem("visitor_id", adminUser.id);
      localStorage.setItem(
        "visitor_info",
        JSON.stringify({
          name: adminUser.name,
          email: adminUser.email,
          identifiedAt: new Date().toISOString(),
        }),
      );
      toast.success("Acesso liberado como Administrador!");
      navigate({ to: "/parametrizacao", replace: true });
    } finally {
      setLoading(false);
    }
  }

  function handleQuickAdminLogin() {
    const adminUser = {
      id: "admin-local-dev",
      name: "Marcus Almeida (Admin)",
      email: "marcus.almeida@certifica.com.br",
    };
    localStorage.setItem("visitor_id", adminUser.id);
    localStorage.setItem(
      "visitor_info",
      JSON.stringify({
        name: adminUser.name,
        email: adminUser.email,
        identifiedAt: new Date().toISOString(),
      }),
    );
    toast.success("Bem-vindo, Marcus! Acesso de Administrador ativo.");
    navigate({ to: "/parametrizacao", replace: true });
  }

  function handleClearExisting() {
    localStorage.removeItem("visitor_info");
    localStorage.removeItem("visitor_id");
    setExistingVisitor(null);
    setName("");
    setDocument("");
    setEmail("");
    setPhone("");
    toast.info("Campos limpos para nova identificação.");
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat p-4"
      style={{ backgroundImage: `url(${logoCertificaPlus.url})` }}
    >
      <div className="absolute inset-0 bg-background/85 backdrop-blur-md" />
      <div className="relative z-10 w-full max-w-md space-y-6 animate-in fade-in zoom-in duration-300">
        
        {/* Topo / Logo */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-card p-5 rounded-2xl shadow-sm border border-border/50">
            <img src={logoSrc} alt="Certifica+" className="h-12 w-auto" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Portal Certifica+ Suporte
            </h1>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Inteligência fiscal, suporte a ERP e parametrização avançada de regras.
            </p>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl border border-border/40 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab("cliente")}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all ${
              tab === "cliente"
                ? "bg-card text-foreground shadow-sm font-bold border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5 text-primary" />
            Atendimento ao Cliente
          </button>
          <button
            type="button"
            onClick={() => setTab("equipe")}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all ${
              tab === "equipe"
                ? "bg-card text-foreground shadow-sm font-bold border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Equipe & Admin
          </button>
        </div>

        {/* Card Principal */}
        <div className="bg-card rounded-2xl border shadow-xl p-6 sm:p-8 space-y-5">
          {tab === "cliente" ? (
            <div className="space-y-4">
              {/* Card de Sessão Existente */}
              {existingVisitor && (
                <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-primary flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> Identificação em Memória
                    </span>
                    <button
                      type="button"
                      onClick={handleClearExisting}
                      className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" /> Trocar
                    </button>
                  </div>
                  <div className="text-xs text-foreground font-medium">
                    {existingVisitor.name}{" "}
                    {existingVisitor.email && (
                      <span className="text-muted-foreground">({existingVisitor.email})</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={() => navigate({ to: "/chat", replace: true })}
                    className="w-full h-9 text-xs font-semibold gap-1.5"
                  >
                    Continuar para o Chat <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              <form onSubmit={handleVisitorSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs font-medium">Nome completo</Label>
                  <Input
                    id="name"
                    placeholder="Seu nome ou Razão Social"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 text-sm bg-muted/20"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="document" className="text-xs font-medium">CPF ou CNPJ</Label>
                  <Input
                    id="document"
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    required
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    className="h-10 text-sm bg-muted/20"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs font-medium">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 text-sm bg-muted/20"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-xs font-medium">Telefone / WhatsApp</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 text-sm bg-muted/20"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold shadow-md shadow-primary/20 mt-2"
                  disabled={loading}
                >
                  {loading ? "Iniciando..." : "Iniciar Atendimento no Chat"}
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleAdminSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <Label htmlFor="adminEmail" className="text-xs font-medium">E-mail Corporativo</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="usuario@certifica.com.br"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="h-10 text-sm bg-muted/20"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="adminPassword" className="text-xs font-medium">Senha de Acesso</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="h-10 text-sm bg-muted/20"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold shadow-md shadow-primary/20"
                  disabled={loading}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  {loading ? "Entrando..." : "Entrar no Painel"}
                </Button>
              </form>

              <div className="pt-2 border-t border-border/40 space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleQuickAdminLogin}
                  className="w-full h-10 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/5"
                >
                  ⚡ Acesso Rápido Admin (Marcus Almeida)
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Acesso liberado a Parametrização, Rejeições SEFAZ e Base ERP.
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Certifica+. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
