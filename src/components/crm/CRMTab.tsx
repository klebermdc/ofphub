import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { Plus, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CRMKanbanColumn } from './CRMKanbanColumn';
import { CRMKanbanCard } from './CRMKanbanCard';
import { CRMLeadDialog } from './CRMLeadDialog';
import { useCRMLeads, CRMLead, CRMStage, CreateLeadData } from '@/hooks/useCRMLeads';

const STAGES: { id: CRMStage; title: string; colorClass: string }[] = [
  { id: 'novo_lead', title: 'Novo Lead', colorClass: 'bg-blue-500/10' },
  { id: 'coletando_informacao', title: 'Coletando Informação', colorClass: 'bg-yellow-500/10' },
  { id: 'proposta_enviada', title: 'Proposta Enviada', colorClass: 'bg-purple-500/10' },
  { id: 'venda_concluida', title: 'Venda Concluída', colorClass: 'bg-green-500/10' },
  { id: 'venda_perdida', title: 'Venda Perdida', colorClass: 'bg-red-500/10' },
];

interface CRMTabProps {
  salespeople?: string[];
}

export function CRMTab({ salespeople = [] }: CRMTabProps) {
  const {
    leads,
    isLoading,
    createLead,
    updateLead,
    moveLead,
    deleteLead,
    getLeadsByStage,
    refetch,
  } = useCRMLeads();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<CRMLead | null>(null);
  const [defaultStage, setDefaultStage] = useState<CRMStage>('novo_lead');
  const [activeLead, setActiveLead] = useState<CRMLead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const lead = event.active.data.current?.lead as CRMLead;
    if (lead) {
      setActiveLead(lead);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const leadId = active.id as string;
    const newStage = over.id as CRMStage;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === newStage) return;

    // Calculate new position (end of the column)
    const stageLeads = getLeadsByStage(newStage);
    const newPosition = stageLeads.length;

    await moveLead(leadId, newStage, newPosition);
  };

  const handleAddLead = (stage: CRMStage) => {
    setDefaultStage(stage);
    setEditingLead(null);
    setDialogOpen(true);
  };

  const handleEditLead = (lead: CRMLead) => {
    setEditingLead(lead);
    setDialogOpen(true);
  };

  const handleSaveLead = async (data: CreateLeadData) => {
    await createLead(data);
  };

  const handleUpdateLead = async (id: string, data: Partial<CRMLead>) => {
    await updateLead(id, data);
  };

  // Calculate summary metrics
  const totalLeads = leads.length;
  const totalValue = leads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);
  const vendasConcluidas = leads.filter((l) => l.stage === 'venda_concluida').length;
  const taxaConversao = totalLeads > 0 ? (vendasConcluidas / totalLeads) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">CRM</h2>
          <p className="text-muted-foreground">
            Gerencie seus leads e oportunidades de venda
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => handleAddLead('novo_lead')}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total Estimado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendas Concluídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{vendasConcluidas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxaConversao.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <CRMKanbanColumn
              key={stage.id}
              stage={stage.id}
              title={stage.title}
              leads={getLeadsByStage(stage.id)}
              colorClass={stage.colorClass}
              onAddLead={handleAddLead}
              onEditLead={handleEditLead}
              onDeleteLead={deleteLead}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? (
            <div className="rotate-3 scale-105">
              <CRMKanbanCard
                lead={activeLead}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Lead Dialog */}
      <CRMLeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lead={editingLead}
        defaultStage={defaultStage}
        salespeople={salespeople}
        onSave={handleSaveLead}
        onUpdate={handleUpdateLead}
      />
    </div>
  );
}
