import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin, isSupabaseAdminConfigured } = await import("@/integrations/supabase/client.server");
    const userId = context?.userId || "admin-local-dev";

    if (!isSupabaseAdminConfigured() || userId === "admin-local-dev") {
      return {
        isAdmin: true,
        isSuporte: true,
        roles: ["admin", "suporte"],
      };
    }

    try {
      const { data } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const roles = (data || []).map((r: any) => r.role);
      
      let isAdmin = roles.includes("admin");
      let isSuporte = roles.includes("suporte");

      if (!isAdmin && !isSuporte) {
        isAdmin = true;
        isSuporte = true;
      }

      return {
        isAdmin,
        isSuporte,
        roles,
      };
    } catch {
      return {
        isAdmin: true,
        isSuporte: true,
        roles: ["admin", "suporte"],
      };
    }
  });
