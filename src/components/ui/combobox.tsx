import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ComboboxOption = { value: string; label: string; hint?: string };

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar ou digitar código...",
  emptyText = "Nada encontrado.",
  className,
  allowCustom = true,
}: {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  /** Permite digitar um código que não está na lista (padrão: true) */
  allowCustom?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const selected = options.find((o) => o.value === value);
  const isCustom = !selected && !!value;
  const term = search.trim();
  const hasExact = options.some((o) => o.value.toLowerCase() === term.toLowerCase());
  const showCustom = allowCustom && term.length > 0 && !hasExact;

  const commit = (v: string) => {
    onChange(v);
    setSearch("");
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="truncate">
            {selected ? (
              selected.label.startsWith(selected.value) ? (
                selected.label
              ) : (
                <>
                  <span className="font-mono text-xs mr-2 text-muted-foreground">{selected.value}</span>
                  {selected.label}
                </>
              )
            ) : isCustom ? (
              <>
                <span className="font-mono text-xs mr-2 text-muted-foreground">{value}</span>
                <span className="text-muted-foreground">(personalizado)</span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(val, s) => {
            if (val === "__custom__") return 1;
            const opt = options.find((o) => o.value === val);
            if (!opt) return 0;
            const hay = `${opt.value} ${opt.label} ${opt.hint ?? ""}`.toLowerCase();
            return hay.includes(s.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
            onKeyDown={(e) => {
              if (e.key === "Enter" && showCustom) {
                e.preventDefault();
                commit(term);
              }
            }}
          />
          <CommandList>
            {!showCustom && <CommandEmpty>{emptyText}</CommandEmpty>}
            {showCustom && (
              <CommandGroup heading="Personalizado">
                <CommandItem value="__custom__" onSelect={() => commit(term)} className="flex items-start gap-2">
                  <Plus className="mt-0.5 h-4 w-4" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      Usar <span className="font-mono">{term}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">Código informado manualmente</div>
                  </div>
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {options.map((opt) => {
                const labelStartsWithValue = opt.label.startsWith(opt.value);
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={(v) => {
                      commit(v === value ? "" : v);
                    }}
                    className="flex items-start gap-2"
                  >
                    <Check className={cn("mt-0.5 h-4 w-4", value === opt.value ? "opacity-100" : "opacity-0")} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        {!labelStartsWithValue && (
                          <span className="font-mono text-xs mr-2 text-muted-foreground">{opt.value}</span>
                        )}
                        {opt.label}
                      </div>
                      {opt.hint && <div className="text-[11px] text-muted-foreground truncate">{opt.hint}</div>}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

