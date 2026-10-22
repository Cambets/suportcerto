import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateLeadDetails } from "@/lib/threads.functions";

interface Props {
  threadId: string;
  contactType?: string | null;
  leadCompany?: string | null;
}

export function LeadCaptureDialog({ threadId, contactType, leadCompany }: Props) {
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [interest, setInterest] = useState("");
  const [saving, setSaving] = useState(false);
  const updateLead = useServerFn(updateLeadDetails);

  useEffect(() => {
    if (contactType !== "lead") return;
    if (leadCompany) return; // já preenchido
    const dismissedKey = `lead_dismissed_${threadId}`;
    if (typeof window !== "undefined" && localStorage.getItem(dismissedKey)) return;
    const t = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(t);
  }, [contactType, leadCompany, threadId]);

  async function handleSubmit() {
    setSaving(true);
    try {
      const visitorId = localStorage.getItem("visitor_id") || "";
      await updateLead({
        data: { threadId, visitorId, leadCompany: company, leadCnpj: cnpj, leadInterest: interest },
      });
      toast.success("Obrigado! Nosso time entrará em contato.");
      localStorage.setItem(`lead_dismissed_${threadId}`, "1");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(`lead_dismissed_${threadId}`, "1");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleDismiss())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conte mais sobre você</DialogTitle>
          <DialogDescription>
            Para personalizarmos o atendimento e prepararmos a melhor proposta, nos diga rapidamente:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="company">Empresa</Label>
            <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Razão social ou nome fantasia" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cnpj">CNPJ (opcional)</Label>
            <Input id="cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="interest">O que está procurando?</Label>
            <Textarea
              id="interest"
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
              placeholder="Ex.: registrar uma nova marca, emitir notas fiscais, abertura de CNPJ..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleDismiss}>
            Agora não
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !company.trim()}>
            {saving ? "Salvando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
