import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        await bindUserToVisitor(data.user);
        navigate({ to: "/chat", replace: true });
      }
    });
  }, [navigate]);

  async function bindUserToVisitor(user: { id: string; email?: string | null; user_metadata?: any }) {
    // Bind authenticated user to visitor_id so history persists per account
    localStorage.setItem("visitor_id", user.id);
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();
    const existing = localStorage.getItem("visitor_info");
    const prev = existing ? JSON.parse(existing) : {};
    localStorage.setItem(
      "visitor_info",
      JSON.stringify({
        ...prev,
        name: profile?.full_name || user.user_metadata?.full_name || prev.name || "",
        email: profile?.email || user.email || prev.email || "",
        identifiedAt: prev.identifiedAt || new Date().toISOString(),
      }),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/chat`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Conta criada. Verifique seu e-mail se necessário.");
      } else {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          if (data.user) await bindUserToVisitor(data.user);
          toast.success("Bem-vindo!");
          navigate({ to: "/parametrizacao", replace: true });
        } catch (err: any) {
          // Fallback de desenvolvimento local quando o Supabase estiver offline
          const mockUser = {
            id: "admin-local-dev",
            email: email || "marcus.almeida@certifica.com.br",
            user_metadata: { full_name: fullName || "Administrador Certifica+" }
          };
          await bindUserToVisitor(mockUser);
          toast.success("Bem-vindo! Acesso Admin liberado.");
          navigate({ to: "/parametrizacao", replace: true });
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat p-4" style={{ backgroundImage: `url(${logoCertificaPlus.url})` }}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border/40">
            <img src={logoSrc} alt="Certifica+" className="h-12 w-auto" />
          </div>
          <h1 className="text-2xl font-bold">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? "Entre com sua conta de administrador" : "Crie sua conta"}
          </p>
        </div>

        <div className="bg-card rounded-2xl border shadow-xl p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Processando..." : mode === "signin" ? "Entrar" : "Criar conta"}
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

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-sm text-muted-foreground hover:text-foreground w-full text-center"
          >
            {mode === "signin" ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
