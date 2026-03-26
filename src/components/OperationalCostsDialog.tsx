import { useState, useEffect } from "react";
import { Briefcase, Bot, Plus, Trash2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface OperationalCostsDialogProps {
  onSave: (
    month: number,
    year: number,
    software: number,
    telefonia: number,
    googleAds?: number,
    metaAds?: number,
    otherMarketing?: number,
    leads?: number,
    description?: string
  ) => Promise<boolean>;
  getCostForMonth: (month: number, year: number) => {
    software: number;
    telefonia: number;
    google_ads: number;
    meta_ads: number;
    other_marketing: number;
    leads: number;
    description: string | null;
  } | undefined;
}

interface CustomCostItem {
  id: string;
  name: string;
  value: string;
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
  const [googleAds, setGoogleAds] = useState("");
  const [metaAds, setMetaAds] = useState("");
  const [otherMarketing, setOtherMarketing] = useState("");
  const [leads, setLeads] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [customCosts, setCustomCosts] = useState<CustomCostItem[]>([]);

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
      setGoogleAds(String(existing.google_ads || 0));
      setMetaAds(String(existing.meta_ads || 0));
      setOtherMarketing(String(existing.other_marketing || 0));
      setLeads(String(existing.leads || 0));

      // Parse custom costs from description if stored as JSON
      const desc = existing.description || "";
      try {
        const parsed = JSON.parse(desc);
        if (Array.isArray(parsed.custom_costs)) {
          setCustomCosts(parsed.custom_costs.map((c: any) => ({
            id: crypto.randomUUID(),
            name: c.name || "",
            value: String(c.value || 0),
          })));
          setDescription(parsed.notes || "");
        } else {
          setDescription(desc);
          setCustomCosts([]);
        }
      } catch {
        setDescription(desc);
        setCustomCosts([]);
      }
    } else {
      setSoftware("");
      setTelefonia("");
      setGoogleAds("");
      setMetaAds("");
      setOtherMarketing("");
      setLeads("");
      setDescription("");
      setCustomCosts([]);
    }
  };

  const addCustomCost = () => {
    setCustomCosts(prev => [...prev, { id: crypto.randomUUID(), name: "", value: "" }]);
  };

  const removeCustomCost = (id: string) => {
    setCustomCosts(prev => prev.filter(c => c.id !== id));
  };

  const updateCustomCost = (id: string, field: "name" | "value", val: string) => {
    setCustomCosts(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  const customCostsTotal = customCosts.reduce((sum, c) => sum + (parseFloat(c.value) || 0), 0);

  const handleSave = async () => {
    setIsSaving(true);

    // Merge custom costs into other_marketing total
    const baseOther = parseFloat(otherMarketing) || 0;
    const totalOther = baseOther + customCostsTotal;

    // Store custom costs detail in description as structured JSON
    const hasCustom = customCosts.length > 0 && customCosts.some(c => c.name || c.value);
    const descriptionPayload = hasCustom
      ? JSON.stringify({
          notes: description,
          custom_costs: customCosts.filter(c => c.name || c.value).map(c => ({
            name: c.name,
            value: parseFloat(c.value) || 0,
          })),
        })
      : description;

    const success = await onSave(
      month,
      year,
      parseFloat(software) || 0,
      parseFloat(telefonia) || 0,
      parseFloat(googleAds) || 0,
      parseFloat(metaAds) || 0,
      totalOther,
      parseInt(leads) || 0,
      descriptionPayload
    );
    setIsSaving(false);
    if (success) {
      setOpen(false);
    }
  };

  const totalOperacional = (parseFloat(software) || 0) + (parseFloat(telefonia) || 0);
  const totalMarketing = (parseFloat(googleAds) || 0) + (parseFloat(metaAds) || 0) + (parseFloat(otherMarketing) || 0) + customCostsTotal;
  const totalGeral = totalOperacional + totalMarketing;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Custos
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Gerenciar Custos
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            Cadastre custos manualmente ou deixe os agentes IA preencherem.
            <Badge variant="secondary" className="gap-1 text-xs">
              <Bot className="h-3 w-3" />
              IA compatível
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Period selector */}
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

          <Tabs defaultValue="operacional" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="operacional">Operacional</TabsTrigger>
              <TabsTrigger value="marketing">Marketing</TabsTrigger>
              <TabsTrigger value="outros">+ Outros</TabsTrigger>
            </TabsList>

            <TabsContent value="operacional" className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label htmlFor="software">Software (R$)</Label>
                <Input
                  id="software"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 813.00"
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
                  placeholder="Ex: 2415.20"
                  value={telefonia}
                  onChange={(e) => setTelefonia(e.target.value)}
                />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Subtotal Operacional</span>
                  <span className="font-semibold">
                    R$ {totalOperacional.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="marketing" className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label htmlFor="googleAds">Google Ads (R$)</Label>
                <Input
                  id="googleAds"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 3541.00"
                  value={googleAds}
                  onChange={(e) => setGoogleAds(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="metaAds">Meta Ads (R$)</Label>
                <Input
                  id="metaAds"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 8652.00"
                  value={metaAds}
                  onChange={(e) => setMetaAds(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherMarketing">Outros Marketing (R$)</Label>
                <Input
                  id="otherMarketing"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 896.00"
                  value={otherMarketing}
                  onChange={(e) => setOtherMarketing(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leads">Leads (quantidade)</Label>
                <Input
                  id="leads"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Ex: 1444"
                  value={leads}
                  onChange={(e) => setLeads(e.target.value)}
                />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Subtotal Marketing</span>
                  <span className="font-semibold">
                    R$ {((parseFloat(googleAds) || 0) + (parseFloat(metaAds) || 0) + (parseFloat(otherMarketing) || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="outros" className="space-y-3 mt-3">
              <p className="text-sm text-muted-foreground">
                Adicione custos personalizados que não se encaixam nas categorias acima.
              </p>

              {customCosts.map((cost) => (
                <div key={cost.id} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Nome do custo</Label>
                    <Input
                      placeholder="Ex: Freelancer, Evento, Consultoria..."
                      value={cost.name}
                      onChange={(e) => updateCustomCost(cost.id, "name", e.target.value)}
                    />
                  </div>
                  <div className="w-28 space-y-1">
                    <Label className="text-xs">Valor (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={cost.value}
                      onChange={(e) => updateCustomCost(cost.id, "value", e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive"
                    onClick={() => removeCustomCost(cost.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={addCustomCost}
              >
                <Plus className="h-4 w-4" />
                Adicionar Custo Personalizado
              </Button>

              {customCosts.length > 0 && (
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Subtotal Outros</span>
                    <span className="font-semibold">
                      R$ {customCostsTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Observações</Label>
            <Textarea
              id="description"
              placeholder="Detalhes, métricas de campanha, notas para auditoria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-16 resize-none"
            />
          </div>

          {/* Total */}
          <div className="bg-primary/10 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Geral</span>
              <span className="font-bold text-lg">
                R$ {totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
