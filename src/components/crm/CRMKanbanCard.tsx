import { useDraggable } from '@dnd-kit/core';
import { Phone, Mail, DollarSign, Package, User, GripVertical, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CRMLead } from '@/hooks/useCRMLeads';

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

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-grab active:cursor-grabbing transition-all hover:shadow-md border-border/50 bg-card ${
        isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''
      }`}
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

        {lead.estimated_value > 0 && (
          <Badge variant="secondary" className="text-xs">
            <DollarSign className="h-3 w-3 mr-1" />
            {formatCurrency(lead.estimated_value)}
          </Badge>
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
