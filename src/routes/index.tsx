import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: IndexComponent,
});

function IndexComponent() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkIdentification = () => {
      const id = localStorage.getItem("visitor_id");
      if (id) {
        navigate({ to: "/chat", replace: true });
      } else {
        navigate({ to: "/login", replace: true });
      }
    };
    checkIdentification();
  }, [navigate]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}
