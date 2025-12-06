import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CRMKanbanCard } from './CRMKanbanCard';
import { CRMLead, CRMStage } from '@/hooks/useCRMLeads';
import { cn } from '@/lib/utils';

interface CRMKanbanColumnProps {
  stage: CRMStage;
  title: string;
  leads: CRMLead[];
  colorClass: string;
  onAddLead: (stage: CRMStage) => void;
  onEditLead: (lead: CRMLead) => void;
  onDeleteLead: (id: string) => void;
}

export function CRMKanbanColumn({
  stage,
  title,
  leads,
  colorClass,
  onAddLead,
  onEditLead,
  onDeleteLead,
}: CRMKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });

  const totalValue = leads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col bg-muted/30 rounded-lg border border-border/50 min-w-[280px] w-[280px] transition-colors',
        isOver && 'bg-primary/5 border-primary/30'
      )}
    >
      {/* Header */}
      <div className={cn('p-3 border-b border-border/50', colorClass)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{title}</h3>
            <span className="text-xs text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full">
              {leads.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onAddLead(stage)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </p>
        )}
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2 min-h-[100px]">
          {leads.map((lead) => (
            <CRMKanbanCard
              key={lead.id}
              lead={lead}
              onEdit={onEditLead}
              onDelete={onDeleteLead}
            />
          ))}
          {leads.length === 0 && (
            <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
              Arraste leads aqui
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
