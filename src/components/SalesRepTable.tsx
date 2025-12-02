import { FileDown, User } from "lucide-react";
import { Button } from "./ui/button";
import { SalesRep } from "@/types/sales";

interface SalesRepTableProps {
  salesReps: SalesRep[];
  onGeneratePDF: (rep: SalesRep) => void;
}

export function SalesRepTable({ salesReps, onGeneratePDF }: SalesRepTableProps) {
  return (
    <div className="glass rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '300ms' }}>
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold">Vendedores</h3>
        <p className="text-sm text-muted-foreground mt-1">Clique para gerar o relatório PDF individual</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Vendedor</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Vendas</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Comissão</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Negócios</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Taxa</th>
              <th className="text-center p-4 text-sm font-medium text-muted-foreground">Ação</th>
            </tr>
          </thead>
          <tbody>
            {salesReps.map((rep, index) => (
              <tr 
                key={rep.id} 
                className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
                style={{ animationDelay: `${400 + index * 50}ms` }}
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-medium">{rep.name}</span>
                  </div>
                </td>
                <td className="p-4 text-right font-mono">
                  R$ {rep.sales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-4 text-right font-mono text-success">
                  R$ {rep.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-4 text-right font-mono">
                  {rep.deals}
                </td>
                <td className="p-4 text-right font-mono">
                  {rep.rate.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%
                </td>
                <td className="p-4 text-center">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onGeneratePDF(rep)}
                    className="gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    Baixar PDF
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
