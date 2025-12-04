import { useState, useEffect } from "react";
import { Briefcase } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OperationalCostsDialogProps {
  onSave: (
    month: number,
    year: number,
    software: number,
    telefonia: number,
    imposto: number
  ) => Promise<boolean>;
  getCostForMonth: (month: number, year: number) => {
    software: number;
    telefonia: number;
    imposto: number;
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

export function OperationalCostsDialog({ onSave, getCostForMonth }: OperationalCostsDialogProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear);
  const [software, setSoftware] = useState("");
  const [telefonia, setTelefonia] = useState("");
  const [imposto, setImposto] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadExistingData();
    }
  }, [open, month, year]);

  const loadExistingData = () => {
    const existing = getCostForMonth(month, year);
    if (existing) {
      setSoftware(String(existing.software || 0));
      setTelefonia(String(existing.telefonia || 0));
      setImposto(String(existing.imposto || 0));
    } else {
      setSoftware("");
      setTelefonia("");
      setImposto("");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSave(
      month,
      year,
      parseFloat(software) || 0,
      parseFloat(telefonia) || 0,
      parseFloat(imposto) || 0
    );
    setIsSaving(false);
    if (success) {
      setOpen(false);
    }
  };

  const total = (parseFloat(software) || 0) + (parseFloat(telefonia) || 0) + (parseFloat(imposto) || 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Briefcase className="h-4 w-4" />
          Custos Operacionais
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Custos Operacionais</DialogTitle>
          <DialogDescription>
            Cadastre os custos operacionais do mês.
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
            <Label htmlFor="software">Software (R$)</Label>
            <Input
              id="software"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={software}
              onChange={(e) => setSoftware(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefonia">Telefonia (R$)</Label>
            <Input
              id="telefonia"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={telefonia}
              onChange={(e) => setTelefonia(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imposto">Imposto (R$)</Label>
            <Input
              id="imposto"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={imposto}
              onChange={(e) => setImposto(e.target.value)}
            />
          </div>

          <div className="bg-muted rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Operacional</span>
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
