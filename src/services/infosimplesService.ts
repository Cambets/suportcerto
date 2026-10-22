import { createServerFn } from "@tanstack/react-start";
import { fetchViabilidadeMarca } from "./infosimples.server";

export const consultarViabilidadeMarca = createServerFn({ method: "POST" })
  .inputValidator((d: { marca: string; classe?: string }) => d)
  .handler(async ({ data }) => {
    const { marca: nomeMarca, classe } = data;
    return fetchViabilidadeMarca(nomeMarca, classe);
  });
