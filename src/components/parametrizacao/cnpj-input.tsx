import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<"input"> & {
  loading?: boolean;
  onLookup?: (value: string) => void;
};

export function CnpjInput({ loading, onLookup, onBlur, onKeyDown, value, className, ...rest }: Props) {
  const handleSearch = () => {
    if (value) {
      onLookup?.(String(value));
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="relative flex items-center">
        <Input
          {...rest}
          value={value as string}
          onBlur={(e) => {
            onLookup?.(String(e.target.value ?? ""));
            onBlur?.(e);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
            onKeyDown?.(e);
          }}
          className={cn("pr-10 font-mono tracking-wide", className)}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center text-primary hover:bg-primary/10 active:bg-primary/20 transition-all cursor-pointer disabled:opacity-50"
              title="Buscar dados do CNPJ na Receita Federal"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Search className="h-4 w-4 text-primary transition-transform hover:scale-110" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Buscar dados do CNPJ na Receita Federal</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
