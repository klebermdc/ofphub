import { useState, useEffect } from "react";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MarketingCostsDialogProps {
  onSave: (
    month: number,
    year: number,
    googleAds: number,
    metaAds: number,
    otherMarketing: number,
    description?: string
  ) => Promise<boolean>;
  getCostForMonth: (month: number, year: number) => {
    google_ads: number;
    meta_ads: number;
    other_marketing: number;
    description: string | null;
  } | undefined;
}

const months = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const currentYear = new Date().getFullYear();
const years = [currentYear - 1, currentYear, currentYear + 1];

export function MarketingCostsDialog({ onSave, getCostForMonth }: MarketingCostsDialogProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear);
  const [googleAds, setGoogleAds] = useState("");
  const [metaAds, setMetaAds] = useState("");
  const [otherMarketing, setOtherMarketing] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadExistingData();
    }
  }, [open, month, year]);

  const loadExistingData = () => {
    const existing = getCostForMonth(month, year);
    if (existing) {
      setGoogleAds(String(existing.google_ads));
      setMetaAds(String(existing.meta_ads));
      setOtherMarketing(String(existing.other_marketing));
      setDescription(existing.description || "");
    } else {
      setGoogleAds("");
      setMetaAds("");
      setOtherMarketing("");
      setDescription("");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSave(
      month,
      year,
      parseFloat(googleAds) || 0,
      parseFloat(metaAds) || 0,
      parseFloat(otherMarketing) || 0,
      description
    );
    setIsSaving(false);
    if (success) {
      setOpen(false);
    }
  };

  const total = (parseFloat(googleAds) || 0) + (parseFloat(metaAds) || 0) + (parseFloat(otherMarketing) || 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Megaphone className="h-4 w-4" />
          Marketing
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Custos de Marketing</DialogTitle>
          <DialogDescription>
            Cadastre os custos de marketing do mês selecionado.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="google">Google Ads (R$)</Label>
            <Input
              id="google"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={googleAds}
              onChange={(e) => setGoogleAds(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta">Meta Ads (R$)</Label>
            <Input
              id="meta"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={metaAds}
              onChange={(e) => setMetaAds(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="other">Outros (R$)</Label>
            <Input
              id="other"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={otherMarketing}
              onChange={(e) => setOtherMarketing(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Detalhes adicionais..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="bg-muted rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Marketing</span>
              <span className="font-bold text-lg">
                R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
