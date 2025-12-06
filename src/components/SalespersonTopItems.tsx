import { useMemo } from 'react';
import { Package, Truck } from 'lucide-react';
import { OrderDetail } from '@/types/sales';

interface SalespersonTopItemsProps {
  orders: OrderDetail[];
}

export function SalespersonTopItems({ orders }: SalespersonTopItemsProps) {
  const { topProducts, topSuppliers } = useMemo(() => {
    // Aggregate by product
    const productMap = new Map<string, { count: number; total: number }>();
    orders.forEach(order => {
      const product = order.produto || 'Sem produto';
      const current = productMap.get(product) || { count: 0, total: 0 };
      productMap.set(product, {
        count: current.count + 1,
        total: current.total + (order.venda || 0)
      });
    });

    // Aggregate by supplier
    const supplierMap = new Map<string, { count: number; total: number }>();
    orders.forEach(order => {
      const supplier = order.fornecedor || 'Sem fornecedor';
      const current = supplierMap.get(supplier) || { count: 0, total: 0 };
      supplierMap.set(supplier, {
        count: current.count + 1,
        total: current.total + (order.venda || 0)
      });
    });

    // Sort and get top 5
    const topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const topSuppliers = Array.from(supplierMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return { topProducts, topSuppliers };
  }, [orders]);

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  if (orders.length === 0) {
    return null;
  }

  const totalSales = orders.reduce((sum, o) => sum + (o.venda || 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Top Products */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/20">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Top 5 Produtos</h3>
            <p className="text-xs text-muted-foreground">Mais vendidos por você</p>
          </div>
        </div>

        <div className="space-y-3">
          {topProducts.map((item, index) => {
            const percentage = totalSales > 0 ? (item.total / totalSales) * 100 : 0;
            return (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 truncate flex-1 min-w-0">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                      {index + 1}
                    </span>
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="font-medium flex-shrink-0 ml-2">{formatCurrency(item.total)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary/60 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">{percentage.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Suppliers */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-info/20">
            <Truck className="h-5 w-5 text-info" />
          </div>
          <div>
            <h3 className="font-semibold">Top 5 Fornecedores</h3>
            <p className="text-xs text-muted-foreground">Mais vendidos por você</p>
          </div>
        </div>

        <div className="space-y-3">
          {topSuppliers.map((item, index) => {
            const percentage = totalSales > 0 ? (item.total / totalSales) * 100 : 0;
            return (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 truncate flex-1 min-w-0">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-info/20 text-info text-xs flex items-center justify-center font-medium">
                      {index + 1}
                    </span>
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="font-medium flex-shrink-0 ml-2">{formatCurrency(item.total)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-info/60 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">{percentage.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
