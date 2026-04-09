import { useMemo } from "react";
import { Palette } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Creative {
  name: string;
  campaign: string;
  spend: number;
  ctr: number;
  clicks: number;
  impressions: number;
  conversions: number;
  cpl: number;
}

interface DailyStat {
  top_creatives?: Creative[];
  [key: string]: any;
}

interface Props {
  stats: DailyStat[];
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const medals = ["🏆", "🥈", "🥉"];

export function TopCreativesTable({ stats }: Props) {
  const creatives = useMemo(() => {
    const map = new Map<string, { name: string; campaign: string; spend: number; clicks: number; impressions: number; conversions: number }>();

    for (const day of stats) {
      const items = day.top_creatives;
      if (!Array.isArray(items)) continue;
      for (const c of items) {
        if (!c.name) continue;
        const existing = map.get(c.name);
        if (existing) {
          existing.spend += c.spend || 0;
          existing.clicks += c.clicks || 0;
          existing.impressions += c.impressions || 0;
          existing.conversions += c.conversions || 0;
        } else {
          map.set(c.name, {
            name: c.name,
            campaign: c.campaign || "",
            spend: c.spend || 0,
            clicks: c.clicks || 0,
            impressions: c.impressions || 0,
            conversions: c.conversions || 0,
          });
        }
      }
    }

    return Array.from(map.values())
      .map((c) => ({
        ...c,
        ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
        cpl: c.conversions > 0 ? c.spend / c.conversions : Infinity,
      }))
      .sort((a, b) => {
        if (a.cpl === Infinity && b.cpl === Infinity) return b.spend - a.spend;
        if (a.cpl === Infinity) return 1;
        if (b.cpl === Infinity) return -1;
        return a.cpl - b.cpl;
      })
      .slice(0, 10);
  }, [stats]);

  if (creatives.length === 0) return null;

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">🎨 Top Criativos</h3>
      </div>
      <div className="overflow-auto max-h-[380px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Criativo</TableHead>
              <TableHead>Campanha</TableHead>
              <TableHead className="text-right">Gasto</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">Conv</TableHead>
              <TableHead className="text-right">CPL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {creatives.map((c, i) => {
              const cplColor =
                c.cpl === Infinity
                  ? "text-muted-foreground"
                  : c.cpl < 10
                  ? "text-[hsl(var(--success))]"
                  : c.cpl <= 15
                  ? "text-[hsl(var(--warning))]"
                  : "text-[hsl(var(--destructive))]";
              return (
                <TableRow key={c.name}>
                  <TableCell className="font-mono text-sm">
                    {i < 3 ? medals[i] : i + 1}
                  </TableCell>
                  <TableCell className="text-xs font-medium max-w-[180px] truncate">
                    {c.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                    {c.campaign}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatBRL(c.spend)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {c.ctr.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {c.conversions}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-xs font-semibold ${cplColor}`}>
                    {c.cpl === Infinity ? "—" : formatBRL(c.cpl)}
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