import { useState } from "react";
import { FileSpreadsheet, Calendar, ClipboardList, Download, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SheetInput } from "@/components/SheetInput";
import { OperationalCostsDialog } from "@/components/OperationalCostsDialog";
import { getMonthName } from "@/utils/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DashboardHeaderControlsProps {
  dataSource: 'sheet' | 'history';
  dashboardMonth: string;
  setDashboardMonth: (month: string) => void;
  availableMonths: string[];
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  savedUrl?: string;
  onSaveOperationalCosts: (month: number, year: number, software: number, telefonia: number) => Promise<boolean>;
  getCostForMonth: (month: number, year: number) => any;
  userId?: string;
  hasApiIntegration?: boolean;
}

export function DashboardHeaderControls({
  dataSource,
  dashboardMonth,
  setDashboardMonth,
  availableMonths,
  onAnalyze,
  isLoading,
  savedUrl,
  onSaveOperationalCosts,
  getCostForMonth,
  userId,
  hasApiIntegration,
}: DashboardHeaderControlsProps) {
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);

  const handleImportCosts = async () => {
    if (!userId) return;
    setImporting(true);
    try {
      // Get the integration config
      const { data: integrations, error: intError } = await supabase
        .from('api_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('integration_name', 'accounting')
        .limit(1);

      if (intError || !integrations?.length) {
        toast({ title: 'Integração não configurada', description: 'Configure a API de contabilidade em Configurações.', variant: 'destructive' });
        setImporting(false);
        return;
      }

      const integration = integrations[0] as any;

      // Fetch data from external API via edge function
      const { data, error } = await supabase.functions.invoke('fetch-accounting-api', {
        body: { apiUrl: integration.api_url, apiKey: integration.api_key }
      });

      if (error || !data?.success) {
        toast({ title: 'Erro ao importar', description: data?.error || error?.message || 'Falha na conexão com a API.', variant: 'destructive' });
        setImporting(false);
        return;
      }

      // Parse the response - try to extract costs from common formats
      const apiData = data.data;
      let software = 0;
      let telefonia = 0;

      if (apiData) {
        // Support various response formats
        if (typeof apiData === 'object' && !Array.isArray(apiData)) {
          software = parseFloat(apiData.software || apiData.Software || apiData.custos_software || 0);
          telefonia = parseFloat(apiData.telefonia || apiData.Telefonia || apiData.custos_telefonia || 0);
        } else if (Array.isArray(apiData)) {
          // Sum up costs from array items by category
          apiData.forEach((item: any) => {
            const cat = (item.categoria || item.category || item.plano_de_contas || '').toLowerCase();
            const valor = parseFloat(item.valor || item.value || item.amount || 0);
            if (cat.includes('software') || cat.includes('sistema') || cat.includes('tecnologia')) {
              software += valor;
            } else if (cat.includes('telefon') || cat.includes('telecom') || cat.includes('comunicação')) {
              telefonia += valor;
            }
          });
        }
      }

      // Determine target month
      const targetMonth = dashboardMonth !== 'all' ? parseInt(dashboardMonth.split('/')[0]) : new Date().getMonth() + 1;
      const targetYear = dashboardMonth !== 'all' ? parseInt(dashboardMonth.split('/')[1]) : new Date().getFullYear();

      const success = await onSaveOperationalCosts(targetMonth, targetYear, software, telefonia);
      if (success) {
        // Update last_sync_at
        await supabase
          .from('api_integrations')
          .update({ last_sync_at: new Date().toISOString() } as any)
          .eq('id', integration.id);

        toast({ 
          title: 'Custos importados!', 
          description: `Software: R$ ${software.toFixed(2)} | Telefonia: R$ ${telefonia.toFixed(2)}` 
        });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao importar custos', description: err.message, variant: 'destructive' });
    }
    setImporting(false);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="text-xs sm:text-sm text-muted-foreground">Fonte:</span>
        <Badge variant={dataSource === 'sheet' ? 'default' : 'secondary'} className="gap-1 text-xs">
          <FileSpreadsheet className="h-3 w-3" />
          {dataSource === 'sheet' ? 'Planilha' : 'Histórico'}
        </Badge>
        
        {/* Filtro de Mês */}
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          <Select value={dashboardMonth} onValueChange={setDashboardMonth}>
            <SelectTrigger className="w-[130px] sm:w-[160px] h-8 text-xs sm:text-sm">
              <SelectValue placeholder="Todos os meses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {availableMonths.map(month => {
                const [m, y] = month.split('/');
                return (
                  <SelectItem key={month} value={month}>
                    {getMonthName(parseInt(m))} {y}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
        {hasApiIntegration && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportCosts}
            disabled={importing}
            className="gap-1 sm:gap-2 text-xs sm:text-sm"
          >
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            <span className="hidden sm:inline">Importar Custos</span>
            <span className="sm:hidden">Importar</span>
          </Button>
        )}
        <OperationalCostsDialog onSave={onSaveOperationalCosts} getCostForMonth={getCostForMonth} />
        <SheetInput onAnalyze={onAnalyze} isLoading={isLoading} compact savedUrl={savedUrl} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/pedidos')}
          className="gap-1 sm:gap-2 text-xs sm:text-sm"
        >
          <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Todos os Pedidos</span>
          <span className="sm:hidden">Pedidos</span>
        </Button>
      </div>
    </div>
  );
}
