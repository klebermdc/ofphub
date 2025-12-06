import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export type CRMStage = 'novo_lead' | 'coletando_informacao' | 'proposta_enviada' | 'venda_concluida' | 'venda_perdida';

export interface CRMLead {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  estimated_value: number;
  product: string | null;
  salesperson_name: string | null;
  notes: string | null;
  stage: CRMStage;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLeadData {
  name: string;
  phone?: string;
  email?: string;
  estimated_value?: number;
  product?: string;
  salesperson_name?: string;
  notes?: string;
  stage?: CRMStage;
}

export function useCRMLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      
      // Type assertion since DB types might not be updated yet
      setLeads((data as unknown as CRMLead[]) || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: 'Erro ao carregar leads',
        description: 'Não foi possível carregar os leads do CRM.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const createLead = async (data: CreateLeadData) => {
    if (!user?.id) return null;

    try {
      // Get max position for the stage
      const stageLeads = leads.filter(l => l.stage === (data.stage || 'novo_lead'));
      const maxPosition = stageLeads.length > 0 
        ? Math.max(...stageLeads.map(l => l.position)) + 1 
        : 0;

      const { data: newLead, error } = await supabase
        .from('crm_leads')
        .insert({
          user_id: user.id,
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          estimated_value: data.estimated_value || 0,
          product: data.product || null,
          salesperson_name: data.salesperson_name || null,
          notes: data.notes || null,
          stage: data.stage || 'novo_lead',
          position: maxPosition,
        })
        .select()
        .single();

      if (error) throw error;

      setLeads(prev => [...prev, newLead as unknown as CRMLead]);
      
      toast({
        title: 'Lead criado',
        description: `${data.name} adicionado ao CRM.`,
      });

      return newLead as unknown as CRMLead;
    } catch (error) {
      console.error('Error creating lead:', error);
      toast({
        title: 'Erro ao criar lead',
        description: 'Não foi possível criar o lead.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateLead = async (id: string, updates: Partial<CRMLead>) => {
    try {
      const { error } = await supabase
        .from('crm_leads')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setLeads(prev => 
        prev.map(lead => lead.id === id ? { ...lead, ...updates } : lead)
      );

      return true;
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: 'Erro ao atualizar lead',
        description: 'Não foi possível atualizar o lead.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const moveLead = async (leadId: string, newStage: CRMStage, newPosition: number) => {
    try {
      // Get leads in target stage to recalculate positions
      const stageLeads = leads.filter(l => l.stage === newStage && l.id !== leadId);
      
      // Update the moved lead
      const { error } = await supabase
        .from('crm_leads')
        .update({ stage: newStage, position: newPosition })
        .eq('id', leadId);

      if (error) throw error;

      // Update local state
      setLeads(prev => 
        prev.map(lead => 
          lead.id === leadId 
            ? { ...lead, stage: newStage, position: newPosition }
            : lead
        )
      );

      return true;
    } catch (error) {
      console.error('Error moving lead:', error);
      toast({
        title: 'Erro ao mover lead',
        description: 'Não foi possível mover o lead.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteLead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('crm_leads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLeads(prev => prev.filter(lead => lead.id !== id));

      toast({
        title: 'Lead removido',
        description: 'O lead foi removido do CRM.',
      });

      return true;
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast({
        title: 'Erro ao remover lead',
        description: 'Não foi possível remover o lead.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const getLeadsByStage = (stage: CRMStage) => {
    return leads
      .filter(lead => lead.stage === stage)
      .sort((a, b) => a.position - b.position);
  };

  return {
    leads,
    isLoading,
    createLead,
    updateLead,
    moveLead,
    deleteLead,
    getLeadsByStage,
    refetch: fetchLeads,
  };
}
