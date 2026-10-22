import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

export type BrasilApiCnpj = {
  razao_social?: string;
  nome_fantasia?: string;
  cnae_fiscal?: number | string;
  cnae_fiscal_descricao?: string;
  cep?: string;
  municipio?: string;
  uf?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
};

export function useCnpjLookup(onResult: (data: BrasilApiCnpj) => void) {
  const [loading, setLoading] = useState(false);
  const lastRef = useRef<string>("");

  const lookup = useCallback(
    async (raw: string, force = false) => {
      const digits = (raw ?? "").replace(/\D/g, "");
      if (digits.length !== 14) {
        if (digits.length > 0 && digits.length !== 11 && force) {
          toast.error("O CNPJ deve conter 14 dígitos.");
        }
        return;
      }
      if (!force && digits === lastRef.current) return;
      lastRef.current = digits;
      setLoading(true);
      try {
        const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
        if (!r.ok) throw new Error("not found");
        const data = (await r.json()) as BrasilApiCnpj;
        onResult(data);
        toast.success("Dados da empresa carregados automaticamente pela Receita Federal.");
      } catch {
        // Fallback para ReceitaWS se a BrasilAPI falhar
        try {
          const r2 = await fetch(`https://corsproxy.io/?https://receitaws.com.br/v1/cnpj/${digits}`);
          if (r2.ok) {
            const data2 = await r2.json();
            if (data2.status === "OK") {
              onResult({
                razao_social: data2.nome,
                nome_fantasia: data2.fantasia,
                cnae_fiscal: data2.atividade_principal?.[0]?.code,
                cnae_fiscal_descricao: data2.atividade_principal?.[0]?.text,
                cep: data2.cep,
                municipio: data2.municipio,
                uf: data2.uf,
                logradouro: data2.logradouro,
                numero: data2.numero,
                bairro: data2.bairro,
              });
              toast.success("Dados da empresa carregados automaticamente.");
              return;
            }
          }
        } catch { /* noop */ }

        toast.error(
          "Não foi possível buscar o CNPJ automaticamente. Por favor, preencha os dados manualmente.",
        );
      } finally {
        setLoading(false);
      }
    },
    [onResult],
  );

  return { loading, lookup };
}

export function formatCnaeFromApi(v: number | string | undefined): string {
  if (v === undefined || v === null) return "";
  const d = String(v).replace(/\D/g, "").padStart(7, "0").slice(-7);
  if (d.length !== 7) return "";
  return `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5, 7)}`;
}
