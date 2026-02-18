import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ApiIntegration {
  id: string;
  integration_name: string;
  api_url: string;
  api_key: string;
  is_active: boolean;
  last_sync_at: string | null;
}

export function useApiIntegrations(userId: string | undefined) {
  const [integrations, setIntegrations] = useState<ApiIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchIntegrations = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_integrations')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setIntegrations((data as any[]) || []);
    } catch (err: any) {
      console.error('Error fetching integrations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const saveIntegration = async (integrationName: string, apiUrl: string, apiKey: string) => {
    if (!userId) return;
    try {
      const existing = integrations.find(i => i.integration_name === integrationName);
      if (existing) {
        const { error } = await supabase
          .from('api_integrations')
          .update({ api_url: apiUrl, api_key: apiKey } as any)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('api_integrations')
          .insert({ user_id: userId, integration_name: integrationName, api_url: apiUrl, api_key: apiKey } as any);
        if (error) throw error;
      }
      await fetchIntegrations();
      toast({ title: 'Integração salva com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar integração', description: err.message, variant: 'destructive' });
    }
  };

  const deleteIntegration = async (id: string) => {
    try {
      const { error } = await supabase
        .from('api_integrations')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchIntegrations();
      toast({ title: 'Integração removida' });
    } catch (err: any) {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' });
    }
  };

  const testConnection = async (apiUrl: string, apiKey: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-accounting-api', {
        body: { apiUrl, apiKey, testOnly: true }
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: 'Conexão bem-sucedida!' });
        return true;
      }
      toast({ title: 'Falha na conexão', description: data?.error || 'Não foi possível conectar', variant: 'destructive' });
      return false;
    } catch (err: any) {
      toast({ title: 'Erro ao testar conexão', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  const getAccountingIntegration = () => integrations.find(i => i.integration_name === 'accounting');

  return { integrations, isLoading, saveIntegration, deleteIntegration, testConnection, getAccountingIntegration, refetch: fetchIntegrations };
}
