import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface OpenClawAction {
  action: string;
  payload?: Record<string, unknown>;
}

export function useOpenClaw() {
  const [isLoading, setIsLoading] = useState(false);

  const invoke = async ({ action, payload }: OpenClawAction) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('openclaw-agent', {
        body: { action, payload },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Erro na comunicação com OpenClaw');
      }

      return data.data;
    } catch (err: any) {
      toast({
        title: 'Erro OpenClaw',
        description: err.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const runTask = (agentId: string, task: string, context?: Record<string, unknown>) =>
    invoke({ action: 'run_task', payload: { agent_id: agentId, task, context } });

  const listAgents = () => invoke({ action: 'list_agents' });

  const getStatus = (runId: string) =>
    invoke({ action: 'get_status', payload: { run_id: runId } });

  const cancelTask = (runId: string) =>
    invoke({ action: 'cancel_task', payload: { run_id: runId } });

  return { runTask, listAgents, getStatus, cancelTask, isLoading };
}
