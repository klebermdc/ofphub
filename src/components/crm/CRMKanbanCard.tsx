import { useDraggable } from '@dnd-kit/core';
import { Phone, Mail, DollarSign, Package, User, GripVertical, MoreHorizontal, Pencil, Trash2, AlertTriangle, Clock, Calendar, Flame, Thermometer, Snowflake, History, CalendarClock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CRMLead } from '@/hooks/useCRMLeads';
import { LeadScore } from '@/hooks/useLeadScoring';
import { ClientHistory } from '@/hooks/useClientHistory';
import { isLeadOverdue, getLeadOverdueDays } from './CRMAlerts';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CRMKanbanCardProps {
  lead: CRMLead & { score?: LeadScore; clientHistory?: ClientHistory };
  onEdit: (lead: CRMLead) => void;
  onDelete: (id: string) => void;
  hideDelete?: boolean;
}

export function CRMKanbanCard({ lead, onEdit, onDelete, hideDelete = false }: CRMKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  const isOverdue = isLeadOverdue(lead);
  const overdueDays = getLeadOverdueDays(lead);

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
  };

  const formatLeadDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = parseISO(dateStr);
      return format(date, 'dd/MM', { locale: ptBR });
    } catch {
      return null;
    }
  };

  const leadDate = lead.notion_created_at || lead.created_at;
  const formattedDate = formatLeadDate(leadDate);
  const formattedUpdatedDate = formatLeadDate(lead.updated_at);

  // Lead score display
  const getScoreIcon = () => {
    if (!lead.score) return null;
    switch (lead.score.label) {
      case 'hot': return <Flame className="h-3 w-3" />;
      case 'warm': return <Thermometer className="h-3 w-3" />;
      case 'cold': return <Snowflake className="h-3 w-3" />;
    }
  };

  // Follow-up date formatting
  const formatFollowUpDate = () => {
    const followUp = (lead as any).follow_up_date;
    if (!followUp) return null;
    try {
      const date = parseISO(followUp);
      if (isToday(date)) return { text: 'Hoje', urgent: true };
      if (isTomorrow(date)) return { text: 'Amanhã', urgent: false };
      if (isPast(date)) return { text: format(date, 'dd/MM', { locale: ptBR }), overdue: true };
      return { text: format(date, 'dd/MM', { locale: ptBR }), urgent: false };
    } catch {
      return null;
    }
  };

  const followUpInfo = formatFollowUpDate();

  // Urgency styling based on days overdue
  const getOverdueStyle = () => {
    if (!isOverdue) return '';
    if (overdueDays >= 5) return 'ring-2 ring-red-500 border-red-500 shadow-red-500/20 shadow-lg';
    if (overdueDays >= 3) return 'ring-2 ring-orange-500 border-orange-500 shadow-orange-500/20 shadow-md';
    return 'ring-1 ring-yellow-500 border-yellow-500';
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-grab active:cursor-grabbing transition-all hover:shadow-md border-border/50 bg-card ${
        isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''
      } ${getOverdueStyle()}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-4 w-4" />
            </div>
            <h4 className="font-medium text-sm truncate">{lead.name}</h4>
            
            {/* Overdue Alert Icon */}
            {isOverdue && (
              <Tooltip>
                <TooltipTrigger>
                  <div className={`p-1 rounded-full ${
                    overdueDays >= 5 ? 'bg-red-500/20 text-red-500 animate-pulse' :
                    overdueDays >= 3 ? 'bg-orange-500/20 text-orange-500' :
                    'bg-yellow-500/20 text-yellow-500'
                  }`}>
                    <AlertTriangle className="h-3 w-3" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>{overdueDays} dias sem atualização</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
            
            {/* Lead Score Badge */}
            {lead.score && (
              <Tooltip>
                <TooltipTrigger>
                  <div className={`p-1 rounded-full ${lead.score.color}`}>
                    {getScoreIcon()}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <div className="font-medium">Score: {lead.score.total}/100</div>
                    <div className="text-xs opacity-80">
                      {lead.score.label === 'hot' && '🔥 Lead quente - Alta prioridade'}
                      {lead.score.label === 'warm' && '🌡️ Lead morno - Médio potencial'}
                      {lead.score.label === 'cold' && '❄️ Lead frio - Baixo potencial'}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Returning Client Badge */}
            {lead.clientHistory?.hasHistory && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="p-1 rounded-full bg-green-500/20 text-green-500">
                    <History className="h-3 w-3" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <div className="font-medium">🔄 Cliente recorrente!</div>
                    <div className="text-xs">
                      {lead.clientHistory.totalPurchases} compra(s) anterior(es)<br/>
                      Total: R$ {lead.clientHistory.totalSpent.toLocaleString('pt-BR')}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(lead)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              {!hideDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(lead.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {formattedDate && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formattedDate}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Data de entrada</TooltipContent>
            </Tooltip>
          )}
          {formattedUpdatedDate && formattedUpdatedDate !== formattedDate && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs bg-muted">
                  <Clock className="h-3 w-3 mr-1" />
                  {formattedUpdatedDate}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Última movimentação</TooltipContent>
            </Tooltip>
          )}
          {lead.estimated_value > 0 && (
            <Badge variant="secondary" className="text-xs">
              <DollarSign className="h-3 w-3 mr-1" />
              {formatCurrency(lead.estimated_value)}
            </Badge>
          )}
          {followUpInfo && (
            <Tooltip>
              <TooltipTrigger>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    followUpInfo.overdue ? 'bg-red-500/20 text-red-500 border-red-500' :
                    followUpInfo.urgent ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500' :
                    'bg-blue-500/20 text-blue-500 border-blue-500'
                  }`}
                >
                  <CalendarClock className="h-3 w-3 mr-1" />
                  {followUpInfo.text}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {followUpInfo.overdue ? 'Follow-up atrasado!' : 'Próximo follow-up'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          {lead.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3" />
              <span className="truncate">{lead.phone}</span>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="h-3 w-3" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          {lead.product && (
            <div className="flex items-center gap-1.5">
              <Package className="h-3 w-3" />
              <span className="truncate">{lead.product}</span>
            </div>
          )}
          {lead.salesperson_name && (
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3" />
              <span className="truncate">{lead.salesperson_name}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
