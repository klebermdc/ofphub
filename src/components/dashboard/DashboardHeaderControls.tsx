import { FileSpreadsheet, Calendar, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SheetInput } from "@/components/SheetInput";
import { OperationalCostsDialog } from "@/components/OperationalCostsDialog";
import { getMonthName } from "@/utils/dateUtils";

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
}: DashboardHeaderControlsProps) {
  const navigate = useNavigate();

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
