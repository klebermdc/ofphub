import { Trophy, Medal, Award, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SalesRep } from "@/types/sales";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isExcludedName } from "@/config/salaries";

interface SalesRankingProps {
  salesReps: SalesRep[];
}

export function SalesRanking({ salesReps }: SalesRankingProps) {
  const navigate = useNavigate();
  // Filter out excluded names (partners) and sort by sales
  const filteredReps = salesReps.filter(rep => !isExcludedName(rep.name));
  const sortedReps = [...filteredReps].sort((a, b) => b.sales - a.sales);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="h-5 w-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{index + 1}</span>;
    }
  };

  const getRankBg = (index: number) => {
    switch (index) {
      case 0:
        return "bg-yellow-500/10 border-yellow-500/30";
      case 1:
        return "bg-gray-400/10 border-gray-400/30";
      case 2:
        return "bg-amber-600/10 border-amber-600/30";
      default:
        return "bg-background/50 border-border/50";
    }
  };

  const handleViewSalesperson = (name: string) => {
    navigate(`/vendedor/${encodeURIComponent(name)}`);
  };

  return (
    <div className="glass rounded-xl p-4 sm:p-6 animate-slide-up">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        <h3 className="text-base sm:text-lg font-semibold">Ranking de Vendedores</h3>
      </div>

      <div className="space-y-2 max-h-[250px] sm:max-h-[300px] overflow-y-auto">
        {sortedReps.map((rep, index) => (
          <div
            key={rep.id}
            className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border ${getRankBg(index)} transition-all hover:scale-[1.01]`}
          >
            <div className="flex items-center justify-center w-6 sm:w-8">
              {getRankIcon(index)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-sm sm:text-base">{rep.name}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{rep.deals} negócios</p>
            </div>
            <div className="text-right mr-1 sm:mr-2">
              <p className="font-mono font-semibold text-xs sm:text-base">
                R$ {rep.sales.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] sm:text-xs text-success">
                R$ {rep.commission.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
                  onClick={() => handleViewSalesperson(rep.name)}
                >
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver dashboard do vendedor</TooltipContent>
            </Tooltip>
          </div>
        ))}
      </div>
    </div>
  );
}
