import { useState, useEffect } from 'react';
import { TrendingUp, Users, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SalespersonConversionKPIProps {
  salespersonName: string;
  month: number;
  year: number;
}

export function SalespersonConversionKPI({ salespersonName, month, year }: SalespersonConversionKPIProps) {
  const [stats, setStats] = useState({
    total: 0,
    converted: 0,
    lost: 0,
    inProgress: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [salespersonName, month, year]);

  const loadStats = async () => {
    try {
      // Fetch all leads for this salesperson
      const { data: leads, error } = await supabase
        .from('crm_leads')
        .select('stage, notion_created_at, created_at')
        .ilike('salesperson_name', `%${salespersonName}%`);

      if (error) throw error;

      // Filter by month/year using notion_created_at or created_at
      const filteredLeads = (leads || []).filter(lead => {
        const dateStr = lead.notion_created_at || lead.created_at;
        if (!dateStr) return false;
        const date = new Date(dateStr);
        return date.getMonth() + 1 === month && date.getFullYear() === year;
      });

      const total = filteredLeads.length;
      const converted = filteredLeads.filter(l => l.stage === 'venda_concluida').length;
      const lost = filteredLeads.filter(l => l.stage === 'venda_perdida').length;
      const inProgress = total - converted - lost;

      setStats({ total, converted, lost, inProgress });
    } catch (err) {
      console.error('Error loading conversion stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const conversionRate = stats.total > 0 ? (stats.converted / stats.total) * 100 : 0;
  const lossRate = stats.total > 0 ? (stats.lost / stats.total) * 100 : 0;

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-6 animate-pulse">
        <div className="h-24 bg-muted/20 rounded" />
      </div>
    );
  }

  if (stats.total === 0) {
    return null;
  }

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/20">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Taxa de Conversão CRM</h3>
          <p className="text-xs text-muted-foreground">Performance do funil de vendas</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 rounded-lg bg-success/10 border border-success/20">
          <div className="text-2xl font-bold text-success">{conversionRate.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">Conversão</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="text-2xl font-bold text-destructive">{lossRate.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">Perdas</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            Total de Leads
          </span>
          <span className="font-medium">{stats.total}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-success">
            <CheckCircle className="h-4 w-4" />
            Vendas Fechadas
          </span>
          <span className="font-medium text-success">{stats.converted}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-destructive">
            <XCircle className="h-4 w-4" />
            Vendas Perdidas
          </span>
          <span className="font-medium text-destructive">{stats.lost}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-warning">
            <TrendingUp className="h-4 w-4" />
            Em Andamento
          </span>
          <span className="font-medium text-warning">{stats.inProgress}</span>
        </div>
      </div>
    </div>
  );
}
