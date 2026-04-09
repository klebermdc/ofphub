import { useState, useEffect } from "react";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MarketingCostsDialogProps {
  onSave: (
    month: number, year: number, googleAds: number, metaAds: number,
    otherMarketing: number, leads: number, description?: string
  ) => Promise<boolean>;
  getCostForMonth: (month: number, year: number) => {
    google_ads: number; meta_ads: number; other_marketing: number;
    leads: number; description: string | null;
  } | undefined;
}

const months = [
  { value: 1, label: "Janeiro" }, { value: 2, label: "Fevereiro" }, { value: 3, label: "Março" },
  { value: 4, label: "Abril" }, { value: 5, label: "Maio" }, { value: 6, label: "Junho" },
  { value: 7, label: "Julho" }, { value: 8, label: "Agosto" }, { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" }, { value: 11, label: "Novembro" }, { value: 12, label: "Dezembro" },
];

const currentYear = new Date().getFullYear();
const years = [currentYear - 1, currentYear, currentYear + 1];

export function MarketingCostsDialog({ onSave, getCostForMonth }: MarketingCostsDialogProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear);
  const [otherMarketing, setOtherMarketing] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const existing = getCostForMonth(month, year);
      if (existing) {
        setOtherMarketing(String(existing.other_marketing || 0));
        setDescription(existing.description || "");
      } else {
        setOtherMarketing("");
        setDescription("");
      }
    }
  }, [open, month, year]);

  const handleSave = async () => {
    setIsSaving(true);
    // Pass 0 for googleAds and metaAds since they come from daily stats now
    // Pass 0 for leads since they come from daily stats now
    const success = await onSave(month, year, 0, 0, parseFloat(otherMarketing) || 0, 0, description);
    setIsSaving(false);
    if (success) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Megaphone className="h-4 w-4" />
          Custos Extras
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Custos Extras de Marketing</DialogTitle>
          <DialogDescription>
            Cadastre custos adicionais de marketing. Os valores de Meta Ads, Google Ads e Leads são importados automaticamente dos dados diários.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="other">Outros Marketing (R$)</Label>
            <Input id="other" type="number" min="0" step="0.01" placeholder="0,00" value={otherMarketing} onChange={(e) => setOtherMarketing(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea id="description" placeholder="Detalhes adicionais..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </div>

          <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
            <p>💡 Os valores de Meta Ads, Google Ads e Leads são importados automaticamente dos dados diários da aba Tráfego Pago.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
