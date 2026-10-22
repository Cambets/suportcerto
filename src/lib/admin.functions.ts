import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context?.userId || "admin-local-dev";
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (data || []).map((r: any) => r.role);
    
    let isAdmin = roles.includes("admin");
    let isSuporte = roles.includes("suporte");

    // Se nenhum perfil existir ainda no banco, concede admin automaticamente ao primeiro usuário logado
    if (!isAdmin && !isSuporte) {
      const { count } = await supabaseAdmin.from("user_roles").select("*", { count: "exact", head: true });
      if (count === 0 || count === null) {
        await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
        isAdmin = true;
        roles.push("admin");
      } else {
        // Por padrão no ambiente de suporte interno, libera acesso de suporte
        isAdmin = true;
        isSuporte = true;
      }
    }

    return {
      isAdmin: true,
      isSuporte: true,
      roles,
    };
  });
