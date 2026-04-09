import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface UtalkData {
  total: number;
  semVendedor: number;
  byAgent: Record<string, number>;
  updatedAt: string;
}

export function WhatsAppStatusCard() {
  const [data, setData] = useState<UtalkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const { data: result, error: err } = await supabase.functions.invoke('utalk-status');
      if (err) throw err;
      setData(result);
    } catch (e: any) {
      console.error('uTalk fetch error:', e);
      setError('Falha ao buscar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const sortedAgents = data
    ? Object.entries(data.byAgent).sort((a, b) => b[1] - a[1])
    : [];

  const timeAgo = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-emerald-400" />
            WhatsApp — Chats Abertos
          </CardTitle>
          <div className="flex items-center gap-2">
            {data && !error && (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs text-muted-foreground">{timeAgo}</span>
              </div>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : loading && !data ? (
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-muted rounded w-20" />
            <div className="h-4 bg-muted rounded w-full" />
          </div>
        ) : data ? (
          <div className="space-y-3">
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-foreground">{data.total}</span>
              <span className="text-sm text-muted-foreground mb-1">chats abertos</span>
              {data.semVendedor > 0 && (
                <Badge variant="destructive" className="mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {data.semVendedor} sem vendedor
                </Badge>
              )}
            </div>
            {sortedAgents.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sortedAgents.map(([name, count]) => (
                  <Badge key={name} variant="secondary" className="text-xs">
                    {name}: {count}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
