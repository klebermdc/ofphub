import { useState } from "react";
import { Database, Calendar as CalendarIcon, ClipboardList, Download, Loader2, RefreshCw, FileText, X, Building } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OperationalCostsDialog } from "@/components/OperationalCostsDialog";
import { getMonthName } from "@/utils/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DashboardHeaderControlsProps {
  dataSource: 'sheet' | 'history';
  dashboardMonth: string;
  setDashboardMonth: (month: string) => void;
  availableMonths: string[];
  onRefresh: () => void;
  isLoading: boolean;
  onSaveOperationalCosts: (month: number, year: number, software: number, telefonia: number, googleAds?: number, metaAds?: number, otherMarketing?: number, leads?: number, description?: string) => Promise<boolean>;
  getCostForMonth: (month: number, year: number) => OperationalCostValues;
  userId?: string;
  hasApiIntegration?: boolean;
  onOpenWeeklyReport?: () => void;
  dateRange?: { from?: Date; to?: Date };
  setDateRange?: (range: { from?: Date; to?: Date }) => void;
  selectedFornecedor?: string;
  setSelectedFornecedor?: (fornecedor: string) => void;
  availableFornecedores?: string[];
}

interface OperationalCostValues {
  software: number;
  telefonia: number;
  google_ads: number;
  meta_ads: number;
  other_marketing: number;
  leads: number;
  description: string;
}

interface AccountingIntegration {
  id: string;
  api_url: string;
  api_key: string;
}

type AccountingApiItem = Record<string, string | number | null | undefined>;

const toNumber = (value: string | number | null | undefined) => Number(value) || 0;
const toText = (value: string | number | null | undefined) => String(value ?? '');

export function DashboardHeaderControls({
  dataSource,
  dashboardMonth,
  setDashboardMonth,
  availableMonths,
  onRefresh,
  isLoading,
  onSaveOperationalCosts,
  getCostForMonth,
  userId,
  hasApiIntegration,
  onOpenWeeklyReport,
  dateRange,
  setDateRange,
  selectedFornecedor = 'all',
  setSelectedFornecedor,
  availableFornecedores = [],
}: DashboardHeaderControlsProps) {
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);

  const handleImportCosts = async () => {
    if (!userId) return;
    setImporting(true);
    try {
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

      const integration = integrations[0] as AccountingIntegration;

      const { data, error } = await supabase.functions.invoke('fetch-accounting-api', {
        body: { apiUrl: integration.api_url, apiKey: integration.api_key }
      });

      if (error || !data?.success) {
        toast({ title: 'Erro ao importar', description: data?.error || error?.message || 'Falha na conexão com a API.', variant: 'destructive' });
        setImporting(false);
        return;
      }

      const apiData = data.data as AccountingApiItem | AccountingApiItem[] | null | undefined;
      let software = 0;
      let telefonia = 0;

      if (apiData) {
        if (typeof apiData === 'object' && !Array.isArray(apiData)) {
          software = toNumber(apiData.software || apiData.Software || apiData.custos_software);
          telefonia = toNumber(apiData.telefonia || apiData.Telefonia || apiData.custos_telefonia);
        } else if (Array.isArray(apiData)) {
          apiData.forEach((item) => {
            const cat = toText(item.categoria || item.category || item.plano_de_contas).toLowerCase();
            const valor = toNumber(item.valor || item.value || item.amount);
            if (cat.includes('software') || cat.includes('sistema') || cat.includes('tecnologia')) {
              software += valor;
            } else if (cat.includes('telefon') || cat.includes('telecom') || cat.includes('comunicação')) {
              telefonia += valor;
            }
          });
        }
      }

      const targetMonth = dashboardMonth !== 'all' ? parseInt(dashboardMonth.split('/')[0]) : new Date().getMonth() + 1;
      const targetYear = dashboardMonth !== 'all' ? parseInt(dashboardMonth.split('/')[1]) : new Date().getFullYear();

      const success = await onSaveOperationalCosts(targetMonth, targetYear, software, telefonia);
      if (success) {
        await supabase
          .from('api_integrations')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', integration.id);

        toast({ 
          title: 'Custos importados!', 
          description: `Software: R$ ${software.toFixed(2)} | Telefonia: R$ ${telefonia.toFixed(2)}` 
        });
      }
    } catch (err: unknown) {
      toast({ title: 'Erro ao importar custos', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    }
    setImporting(false);
  };


  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="text-xs sm:text-sm text-muted-foreground">Fonte:</span>
        <Badge variant="default" className="gap-1 text-xs">
          <Database className="h-3 w-3" />
          Banco de Dados
        </Badge>
        
        {/* Filtro de Mês */}
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          <Select
            value={dashboardMonth}
            onValueChange={(v) => {
              setDashboardMonth(v);
              setDateRange?.({});
            }}
          >
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

        {/* Filtro por Data Inicial e Final */}
        {setDateRange && (
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("h-8 text-xs gap-1", !dateRange?.from && "text-muted-foreground")}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dateRange?.from ? format(dateRange.from, "dd/MM/yy", { locale: ptBR }) : "Data inicial"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange?.from}
                  onSelect={(d) => setDateRange({ ...dateRange, from: d || undefined })}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">→</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("h-8 text-xs gap-1", !dateRange?.to && "text-muted-foreground")}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dateRange?.to ? format(dateRange.to, "dd/MM/yy", { locale: ptBR }) : "Data final"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange?.to}
                  onSelect={(d) => setDateRange({ ...dateRange, to: d || undefined })}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {(dateRange?.from || dateRange?.to) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => setDateRange({})}
                title="Limpar filtro de datas"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}

        {setSelectedFornecedor && (
          <div className="flex items-center gap-2">
            <Building className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <Select value={selectedFornecedor} onValueChange={setSelectedFornecedor}>
              <SelectTrigger className="w-[145px] sm:w-[180px] h-8 text-xs sm:text-sm">
                <SelectValue placeholder="Fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos fornecedores</SelectItem>
                {availableFornecedores.map(fornecedor => (
                  <SelectItem key={fornecedor} value={fornecedor}>
                    {fornecedor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
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
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenWeeklyReport}
          className="gap-1 sm:gap-2 text-xs sm:text-sm"
        >
          <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">📄 Relatório Semanal</span>
          <span className="sm:hidden">📄 Relatório</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="gap-1 sm:gap-2 text-xs sm:text-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </Button>
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
