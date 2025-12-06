import { useState, useMemo } from 'react';
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
import { Plus, RefreshCw, CloudDownload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CRMKanbanColumn } from './CRMKanbanColumn';
import { CRMKanbanCard } from './CRMKanbanCard';
import { CRMLeadDialog } from './CRMLeadDialog';
import { CRMFilters } from './CRMFilters';
import { useCRMLeads, CRMLead, CRMStage, CreateLeadData } from '@/hooks/useCRMLeads';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const STAGES: { id: CRMStage; title: string; colorClass: string }[] = [
  { id: 'novo_lead', title: 'Novo Lead', colorClass: 'bg-blue-500/10' },
  { id: 'coletando_informacao', title: 'Coletando Informação', colorClass: 'bg-yellow-500/10' },
  { id: 'proposta_enviada', title: 'Proposta Enviada', colorClass: 'bg-purple-500/10' },
  { id: 'venda_concluida', title: 'Venda Concluída', colorClass: 'bg-green-500/10' },
  { id: 'venda_perdida', title: 'Venda Perdida', colorClass: 'bg-red-500/10' },
];

interface CRMTabProps {
  salespeople?: string[];
  salespersonFilter?: string; // For salesperson view - only show their leads
  isReadOnly?: boolean; // For salesperson view - restrict certain actions
}

export function CRMTab({ salespeople = [], salespersonFilter, isReadOnly = false }: CRMTabProps) {
  const { toast } = useToast();
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

  const [isSyncing, setIsSyncing] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<CRMLead | null>(null);
  const [defaultStage, setDefaultStage] = useState<CRMStage>('novo_lead');
  const [activeLead, setActiveLead] = useState<CRMLead | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<CRMStage | 'all'>('all');
  const [selectedSalesperson, setSelectedSalesperson] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Extract unique products and months for filters
  const { uniqueProducts, uniqueMonths, uniqueSalespeople } = useMemo(() => {
    const products = new Set<string>();
    const months = new Set<string>();
    const spNames = new Set<string>();

    leads.forEach((lead) => {
      if (lead.product) products.add(lead.product);
      if (lead.salesperson_name) spNames.add(lead.salesperson_name);
      if (lead.created_at) {
        const date = new Date(lead.created_at);
        const monthStr = format(date, 'MMMM yyyy', { locale: ptBR });
        months.add(monthStr);
      }
    });

    return {
      uniqueProducts: Array.from(products).sort(),
      uniqueMonths: Array.from(months),
      uniqueSalespeople: salespeople.length > 0 ? salespeople : Array.from(spNames).sort(),
    };
  }, [leads, salespeople]);

  // Apply filters to leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Salesperson filter (for salesperson view)
      if (salespersonFilter && lead.salesperson_name !== salespersonFilter) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          lead.name?.toLowerCase().includes(search) ||
          lead.email?.toLowerCase().includes(search) ||
          lead.phone?.includes(search) ||
          lead.product?.toLowerCase().includes(search) ||
          lead.notes?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Stage filter
      if (selectedStage !== 'all' && lead.stage !== selectedStage) {
        return false;
      }

      // Salesperson filter (for manager view)
      if (!salespersonFilter && selectedSalesperson !== 'all' && lead.salesperson_name !== selectedSalesperson) {
        return false;
      }

      // Product filter
      if (selectedProduct !== 'all' && lead.product !== selectedProduct) {
        return false;
      }

      // Month filter
      if (selectedMonth !== 'all' && lead.created_at) {
        const leadMonth = format(new Date(lead.created_at), 'MMMM yyyy', { locale: ptBR });
        if (leadMonth !== selectedMonth) return false;
      }

      return true;
    });
  }, [leads, searchTerm, selectedStage, selectedSalesperson, selectedProduct, selectedMonth, salespersonFilter]);

  // Get filtered leads by stage
  const getFilteredLeadsByStage = (stage: CRMStage) => {
    return filteredLeads
      .filter((lead) => lead.stage === stage)
      .sort((a, b) => a.position - b.position);
  };

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
    // If salesperson view, auto-assign to that salesperson
    if (salespersonFilter) {
      data.salesperson_name = salespersonFilter;
    }
    await createLead(data);
  };

  const handleUpdateLead = async (id: string, data: Partial<CRMLead>) => {
    await updateLead(id, data);
  };

  // Calculate summary metrics from filtered leads
  const totalLeads = filteredLeads.length;
  const totalValue = filteredLeads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);
  const vendasConcluidas = filteredLeads.filter((l) => l.stage === 'venda_concluida').length;
  const taxaConversao = totalLeads > 0 ? (vendasConcluidas / totalLeads) * 100 : 0;

  // Sync from Notion
  const handleNotionSync = async () => {
    setIsSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Erro',
          description: 'Usuário não autenticado',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('notion-crm-sync', {
        body: { user_id: user.id },
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: 'Sincronização concluída',
          description: `${data.created} novos leads, ${data.updated} atualizados`,
        });
        refetch();
      } else {
        throw new Error(data?.error || 'Erro na sincronização');
      }
    } catch (error) {
      console.error('Notion sync error:', error);
      toast({
        title: 'Erro na sincronização',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">CRM</h2>
          <p className="text-muted-foreground">
            {salespersonFilter 
              ? `Seus leads e oportunidades de venda`
              : 'Gerencie seus leads e oportunidades de venda'
            }
          </p>
        </div>
        <div className="flex gap-2">
          {!salespersonFilter && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleNotionSync} 
              disabled={isSyncing}
            >
              <CloudDownload className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-pulse' : ''}`} />
              Sync Notion
            </Button>
          )}
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

      {/* Filters */}
      <CRMFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedStage={selectedStage}
        onStageChange={setSelectedStage}
        selectedSalesperson={selectedSalesperson}
        onSalespersonChange={setSelectedSalesperson}
        selectedProduct={selectedProduct}
        onProductChange={setSelectedProduct}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        salespeople={uniqueSalespeople}
        products={uniqueProducts}
        months={uniqueMonths}
        showSalespersonFilter={!salespersonFilter}
      />

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
              leads={getFilteredLeadsByStage(stage.id)}
              colorClass={stage.colorClass}
              onAddLead={handleAddLead}
              onEditLead={handleEditLead}
              onDeleteLead={isReadOnly ? undefined : deleteLead}
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
        salespeople={salespersonFilter ? [salespersonFilter] : uniqueSalespeople}
        onSave={handleSaveLead}
        onUpdate={handleUpdateLead}
      />
    </div>
  );
}
