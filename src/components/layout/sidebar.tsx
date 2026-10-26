import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, MessageSquarePlus, BookOpen, Trash2, Search, ClipboardCheck, GraduationCap, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logoSrc from "@/assets/logo_certifica.svg";
import { useThreads } from "@/hooks/use-threads";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { checkIsAdmin } from "@/lib/admin.functions";

export function Sidebar() {
  const { threads, activeId, handleNew, handleDelete } = useThreads();
  const navigate = useNavigate();
  const visitorJson = typeof window !== "undefined" ? localStorage.getItem("visitor_info") : null;
  const visitor = visitorJson ? JSON.parse(visitorJson) : null;
  const checkIsAdminFn = useServerFn(checkIsAdmin);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuporte, setIsSuporte] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const hasLocalDev = typeof window !== "undefined" && localStorage.getItem("visitor_id") === "admin-local-dev";
    if (hasLocalDev) {
      setIsAdmin(true);
      setIsSuporte(true);
      return;
    }

    if (!isSupabaseConfigured()) {
      setIsAdmin(false);
      setIsSuporte(false);
      return;
    }

    supabase.auth.getUser()
      .then(async ({ data }) => {
        if (!data?.user && !hasLocalDev) return;
        try {
          const res = await checkIsAdminFn();
          if (!cancelled) {
            setIsAdmin(res.isAdmin || hasLocalDev);
            setIsSuporte(res.isSuporte || hasLocalDev);
          }
        } catch {
          if (hasLocalDev && !cancelled) {
            setIsAdmin(true);
            setIsSuporte(true);
          }
        }
      })
      .catch(() => {
        if (hasLocalDev && !cancelled) {
          setIsAdmin(true);
          setIsSuporte(true);
        }
      });
    return () => { cancelled = true; };
  }, [checkIsAdminFn]);

  async function handleLogout() {
    localStorage.removeItem("visitor_info");
    localStorage.removeItem("visitor_id");
    try {
      await supabase.auth.signOut();
    } catch {
      // offline fallback
    }
    navigate({ to: "/login", replace: true });
  }



  return (
    <aside className="hidden md:flex w-72 flex-col border-r bg-card shadow-sm z-20">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-6 py-8">
          <div className="bg-primary/5 p-2 rounded-lg">
            <img src={logoSrc} alt="Certifica+" className="h-8 w-auto" />
          </div>
        </div>
        
        <div className="px-4 mb-4">
          <Button 
            onClick={handleNew} 
            className="w-full justify-start gap-2 h-11 px-4 shadow-md shadow-primary/10 hover:shadow-lg transition-all"
          >
            <MessageSquarePlus className="h-4 w-4" /> 
            <span className="font-medium">Nova conversa</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-6">
          <div>
            <div className="px-3 mb-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">Navegação</div>
            <nav className="space-y-1">
              <Link
                to="/parametrizacao"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors group"
                activeProps={{ className: "bg-primary/10 text-primary hover:bg-primary/15 font-semibold" }}
              >
                <ClipboardCheck className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                Parametrização Fiscal
              </Link>
              <Link
                to="/rejeicoes"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors group"
                activeProps={{ className: "bg-primary/10 text-primary hover:bg-primary/15 font-semibold" }}
              >
                <GraduationCap className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                Base de Rejeições SEFAZ
              </Link>
              <Link
                to="/conhecimento"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors group"
                activeProps={{ className: "bg-primary/10 text-primary hover:bg-primary/15 font-semibold" }}
              >
                <BookOpen className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                Base de Conhecimento
              </Link>
              {isAdmin && (
                <Link
                  to="/usuarios"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors group"
                  activeProps={{ className: "bg-primary/10 text-primary hover:bg-primary/15 font-semibold" }}
                >
                  <Users className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  Gestão de Usuários
                </Link>
              )}
            </nav>
          </div>

          <div>
            <div className="px-3 mb-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 flex justify-between items-center">
              Histórico
              <span className="bg-muted px-1.5 py-0.5 rounded text-[9px]">{threads.length}</span>
            </div>
            <nav className="space-y-1">
              {threads.length === 0 && (
                <p className="px-3 py-4 text-xs text-muted-foreground text-center italic">Nenhuma conversa recente</p>
              )}
              {threads.map((t) => (
                <div key={t.id} className="group relative">
                  <Link
                    to="/chat/$threadId"
                    params={{ threadId: t.id }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm truncate hover:bg-muted transition-colors pr-10",
                      activeId === t.id && "bg-muted font-semibold text-foreground border-l-2 border-primary rounded-l-none",
                    )}
                  >
                    <span className="truncate">{t.title}</span>
                  </Link>
                  <button
                    onClick={(e) => handleDelete(t.id, e)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1.5 hover:bg-destructive/10 rounded-md transition-all"
                    aria-label="Apagar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </nav>
          </div>
        </div>

        <div className="p-4 border-t bg-muted/20">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-card border shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                {visitor?.name?.substring(0, 2).toUpperCase() || "V"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate">{visitor?.name || "Visitante"}</span>
                <span className="text-[10px] text-muted-foreground truncate italic">{visitor?.email || "Certifica+"}</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon-sm" 
              onClick={handleLogout} 
              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
