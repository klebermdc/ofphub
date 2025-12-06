import { useDraggable } from '@dnd-kit/core';
import { Phone, Mail, DollarSign, Package, User, GripVertical, MoreHorizontal, Pencil, Trash2, AlertTriangle, Clock, Calendar } from 'lucide-react';
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
import { isLeadOverdue, getLeadOverdueDays } from './CRMAlerts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CRMKanbanCardProps {
  lead: CRMLead;
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

        {(lead.estimated_value > 0 || formattedDate) && (
          <div className="flex items-center gap-2 flex-wrap">
            {formattedDate && (
              <Badge variant="outline" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {formattedDate}
              </Badge>
            )}
            {lead.estimated_value > 0 && (
              <Badge variant="secondary" className="text-xs">
                <DollarSign className="h-3 w-3 mr-1" />
                {formatCurrency(lead.estimated_value)}
              </Badge>
            )}
          </div>
        )}

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
