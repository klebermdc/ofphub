import { Users, Medal, TrendingUp } from "lucide-react";
import { SalesRep } from "@/types/sales";
import { cn } from "@/lib/utils";

interface TopClientsTableProps {
  salesReps: SalesRep[];
}

interface ClientData {
  name: string;
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function TopClientsTable({ salesReps }: TopClientsTableProps) {
  // Aggregate client data across all sales reps
  const clientMap = new Map<string, ClientData>();

  salesReps.forEach(rep => {
    rep.orders?.forEach(order => {
      if (!order.cliente) return;
      
      const existing = clientMap.get(order.cliente);
      if (existing) {
        existing.totalRevenue += order.venda;
        existing.orderCount += 1;
        existing.avgOrderValue = existing.totalRevenue / existing.orderCount;
      } else {
        clientMap.set(order.cliente, {
          name: order.cliente,
          totalRevenue: order.venda,
          orderCount: 1,
          avgOrderValue: order.venda
        });
      }
    });
  });

  // Sort by revenue and get top 10
  const topClients = Array.from(clientMap.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);

  // Calculate total revenue for percentage
  const totalRevenue = topClients.reduce((sum, c) => sum + c.totalRevenue, 0);
  const allClientsRevenue = Array.from(clientMap.values()).reduce((sum, c) => sum + c.totalRevenue, 0);
  const top10Percentage = allClientsRevenue > 0 ? (totalRevenue / allClientsRevenue) * 100 : 0;

  if (topClients.length === 0) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Top 10 Clientes</h3>
        </div>
        <p className="text-muted-foreground text-sm">Nenhum cliente encontrado.</p>
      </div>
    );
  }

  const getRankStyle = (index: number) => {
    if (index === 0) return "bg-amber-500/20 text-amber-500 border-amber-500/30";
    if (index === 1) return "bg-slate-300/20 text-slate-300 border-slate-300/30";
    if (index === 2) return "bg-orange-600/20 text-orange-400 border-orange-600/30";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="glass rounded-xl p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Top 10 Clientes</h3>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          <span className="text-muted-foreground">
            Representam <span className="font-semibold text-emerald-500">{top10Percentage.toFixed(1)}%</span> do faturamento
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {topClients.map((client, index) => {
          const percentage = allClientsRevenue > 0 ? (client.totalRevenue / allClientsRevenue) * 100 : 0;
          
          return (
            <div key={client.name} className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border",
                getRankStyle(index)
              )}>
                {index < 3 ? <Medal className="h-4 w-4" /> : index + 1}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{client.name}</p>
                <p className="text-xs text-muted-foreground">
                  {client.orderCount} pedido{client.orderCount !== 1 ? 's' : ''} • Ticket médio: {formatCurrency(client.avgOrderValue)}
                </p>
              </div>
              
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(client.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
