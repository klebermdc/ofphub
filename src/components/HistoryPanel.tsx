import { Calendar, Trash2, Eye } from "lucide-react";
import { Button } from "./ui/button";
import { CommissionReport, getMonthName } from "@/hooks/useCommissionHistory";

interface HistoryPanelProps {
  reports: CommissionReport[];
  isLoading: boolean;
  onLoad: (reportId: string) => void;
  onDelete: (reportId: string) => void;
  currentReportId?: string;
}

export function HistoryPanel({ 
  reports, 
  isLoading, 
  onLoad, 
  onDelete,
  currentReportId 
}: HistoryPanelProps) {
  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-secondary rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-secondary rounded"></div>
          <div className="h-16 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden animate-slide-up">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Histórico de Comissões</h3>
      </div>
      
      {reports.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground">
          <p>Nenhum relatório salvo ainda.</p>
          <p className="text-sm mt-1">Importe uma planilha e salve para criar histórico.</p>
        </div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto">
          {reports.map((report) => (
            <div
              key={report.id}
              className={`p-4 border-b border-border/50 hover:bg-secondary/20 transition-colors ${
                currentReportId === report.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">
                  {getMonthName(report.period_month)} {report.period_year}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onLoad(report.id)}
                    className="h-8 w-8 p-0"
                    title="Visualizar"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(report.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>
                  <span className="text-xs">Vendas</span>
                  <p className="font-mono text-foreground">{formatCurrency(Number(report.total_vendas))}</p>
                </div>
                <div>
                  <span className="text-xs">Comissões</span>
                  <p className="font-mono text-success">{formatCurrency(Number(report.total_comissao))}</p>
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {report.vendedores_ativos} vendedores • {report.total_negocios} pedidos
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
