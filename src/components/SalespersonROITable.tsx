import { TrendingUp } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { SalesRep } from "@/types/sales";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SalespersonROITableProps {
  salesReps: SalesRep[];
  getSalary: (name: string) => number;
}

export function SalespersonROITable({ salesReps, getSalary }: SalespersonROITableProps) {
  const rows = salesReps
    .map((rep) => {
      const vendas = rep.sales;
      const comissaoGerada = rep.orders?.reduce((s, o) => s + (o.comissaoTotal || 0), 0) ?? 0;
      const comissaoRecebida = rep.orders?.reduce((s, o) => s + (o.comissaoVendedor || 0), 0) ?? 0;
      const salarioBase = getSalary(rep.name);
      const custoTotal = salarioBase + comissaoRecebida;
      const lucro = comissaoGerada - custoTotal;
      const roi = custoTotal > 0 ? lucro / custoTotal : 0;
      const isInactive = vendas === 0;

      return { name: rep.name, vendas, comissaoGerada, comissaoRecebida, salarioBase, custoTotal, lucro, roi, isInactive };
    })
    .filter((row) => row.salarioBase > 0)
    .sort((a, b) => {
      if (a.isInactive && !b.isInactive) return 1;
      if (!a.isInactive && b.isInactive) return -1;
      return b.roi - a.roi;
    });

  const getStatus = (roi: number, inactive: boolean) => {
    if (inactive) return { label: "Inativo", variant: "outline" as const, className: "text-muted-foreground" };
    if (roi > 0.5) return { label: "Excelente", variant: "default" as const, className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
    if (roi >= 0.15) return { label: "Bom", variant: "default" as const, className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
    return { label: "Baixo", variant: "default" as const, className: "bg-destructive/20 text-destructive border-destructive/30" };
  };

  return (
    <div className="glass rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">ROI por Vendedor</h3>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Vendas</TableHead>
              <TableHead className="text-right">Comissão Gerada</TableHead>
              <TableHead className="text-right">Salário Base</TableHead>
              <TableHead className="text-right">ROI</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const status = getStatus(row.roi, row.isInactive);
              return (
                <TableRow key={row.name}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.vendas)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.comissaoGerada)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.salarioBase)}</TableCell>
                  <TableCell className="text-right font-bold">
                    {row.isInactive ? "-" : `${row.roi.toFixed(1)}x`}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={status.variant} className={status.className}>
                      {status.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
