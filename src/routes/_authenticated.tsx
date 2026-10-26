import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthLayout,
});

function AuthLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const visitorId = localStorage.getItem("visitor_id");
      const visitorInfo = localStorage.getItem("visitor_info");
      if (!visitorId && !visitorInfo) {
        navigate({ to: "/login", replace: true });
      } else if (!visitorId) {
        localStorage.setItem("visitor_id", "visitor-" + Math.random().toString(36).substring(2, 10));
      }
    } catch {
      // Ignora erro
    }
  }, [navigate]);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 relative overflow-hidden bg-muted/5">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 pointer-events-none" />
        <Outlet />
      </main>
    </div>
  );
}
