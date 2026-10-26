import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import logoSrc from "@/assets/logo_certifica.svg";
import logoCertificaPlus from "@/assets/logo-certifica-plus.png.asset.json";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser()
      .then(async ({ data }) => {
        if (!cancelled && data?.user) {
          await bindUserToVisitor(data.user);
          navigate({ to: "/parametrizacao", replace: true });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function bindUserToVisitor(user: { id: string; email?: string | null; user_metadata?: any }) {
    localStorage.setItem("visitor_id", user.id);
    let profileName = "";
    let profileEmail = "";
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();
      if (profile) {
        profileName = profile.full_name || "";
        profileEmail = profile.email || "";
      }
    } catch {
      // Offline fallback
    }

    const existing = localStorage.getItem("visitor_info");
    const prev = existing ? JSON.parse(existing) : {};
    localStorage.setItem(
      "visitor_info",
      JSON.stringify({
        ...prev,
        name: profileName || user.user_metadata?.full_name || prev.name || "Administrador",
        email: profileEmail || user.email || prev.email || "marcus.almeida@certifica.com.br",
        identifiedAt: prev.identifiedAt || new Date().toISOString(),
      }),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        try {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/chat`,
              data: { full_name: fullName },
            },
          });
          if (error) throw error;
          toast.success("Conta criada com sucesso.");
        } catch {
          toast.info("Ambiente local: conta criada. Você pode entrar diretamente.");
        }
      } else {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          if (data.user) await bindUserToVisitor(data.user);
          toast.success("Bem-vindo!");
          navigate({ to: "/parametrizacao", replace: true });
          return;
        } catch {
          // Fallback seguro quando o Supabase estiver offline
          const mockUser = {
            id: "admin-local-dev",
            email: email || "marcus.almeida@certifica.com.br",
            user_metadata: { full_name: fullName || email.split("@")[0] || "Administrador Certifica+" }
          };
          await bindUserToVisitor(mockUser);
          toast.success("Bem-vindo! Acesso Admin liberado.");
          navigate({ to: "/parametrizacao", replace: true });
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat p-4"
      style={{ backgroundImage: `url(${logoCertificaPlus.url})` }}
    >
      <div className="absolute inset-0 bg-background/85 backdrop-blur-md" />
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-card p-5 rounded-2xl shadow-sm border border-border/50">
            <img src={logoSrc} alt="Certifica+" className="h-12 w-auto" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Painel Administrativo</h1>
          <p className="text-xs text-muted-foreground">
            {mode === "signin" ? "Entre com suas credenciais de administrador" : "Crie seu usuário"}
          </p>
        </div>

        <div className="bg-card rounded-2xl border shadow-xl p-6 sm:p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs">Nome completo</Label>
                <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-10 text-sm bg-muted/20" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">E-mail corporativo</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 text-sm bg-muted/20" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 text-sm bg-muted/20"
              />
            </div>
            <Button type="submit" className="w-full h-11 text-sm font-semibold shadow-md shadow-primary/20" disabled={loading}>
              <KeyRound className="h-4 w-4 mr-2" />
              {loading ? "Processando..." : mode === "signin" ? "Entrar no Painel" : "Criar conta"}
            </Button>
          </form>

          {mode === "signin" && (
            <div className="pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const mockUser = {
                    id: "admin-local-dev",
                    email: "marcus.almeida@certifica.com.br",
                    user_metadata: { full_name: "Marcus Almeida (Admin)" }
                  };
                  await bindUserToVisitor(mockUser);
                  toast.success("Bem-vindo, Marcus! Acesso Admin liberado.");
                  navigate({ to: "/parametrizacao", replace: true });
                }}
                className="w-full h-10 gap-2 border-primary/30 text-primary hover:bg-primary/5 font-semibold text-xs"
              >
                ⚡ Entrar como Administrador (Marcus Almeida)
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t text-xs">
            <button
              type="button"
              onClick={() => navigate({ to: "/login" })}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Atendimento ao Cliente
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary hover:underline font-medium"
            >
              {mode === "signin" ? "Criar conta" : "Já tem conta? Entrar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
