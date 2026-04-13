import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParsedOrder, MONTH_NAMES, YEAR_COLORS, formatCompact, aggregateOrdersByMonth } from "./growthUtils";

interface Props {
  orders: ParsedOrder[];
}

export function GrowthSeasonality({ orders }: Props) {
  const heatData = useMemo(() => {
    const agg = aggregateOrdersByMonth(orders);
    const years = [2023, 2024, 2025, 2026];
    let maxVal = 0;
    const grid = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const cells = years.map(y => {
        const found = agg.find(a => a.year === y && a.month === month);
        const val = found?.revenue || 0;
        if (val > maxVal) maxVal = val;
        return { year: y, value: val };
      });
      return { month, label: MONTH_NAMES[i], cells };
    });
    return { grid, maxVal, years };
  }, [orders]);

  const getOpacity = (val: number) => {
    if (val === 0 || heatData.maxVal === 0) return 0.05;
    return 0.2 + (val / heatData.maxVal) * 0.8;
  };

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg">Sazonalidade — Qual mês vende mais?</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="grid gap-1" style={{ gridTemplateColumns: `60px repeat(${heatData.years.length}, 1fr)` }}>
            <div />
            {heatData.years.map(y => (
              <div key={y} className="text-center text-xs font-medium text-muted-foreground">{y}</div>
            ))}
            {heatData.grid.map(row => (
              <>
                <div key={`label-${row.month}`} className="text-xs font-medium text-muted-foreground flex items-center">{row.label}</div>
                {row.cells.map(cell => (
                  <div
                    key={`${row.month}-${cell.year}`}
                    className="rounded-md p-2 text-center text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: cell.value > 0 ? `${YEAR_COLORS[cell.year]}` : undefined,
                      opacity: getOpacity(cell.value),
                      color: cell.value > 0 ? '#fff' : 'hsl(var(--muted-foreground))',
                    }}
                    title={`${row.label} ${cell.year}: ${formatCompact(cell.value)}`}
                  >
                    {cell.value > 0 ? formatCompact(cell.value) : "—"}
                  </div>
                ))}
              </>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
