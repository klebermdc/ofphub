import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AgentActivity {
  id: string;
  agent_name: string;
  agent_key: string;
  area: string;
  status: string;
  last_action: string | null;
  last_summary: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  last_duration_ms: number | null;
  last_error: string | null;
  last_channel: string | null;
  persona: string | null;
  specialty: string | null;
  mission: string | null;
  style: string | null;
  experience_level: string | null;
  updated_at: string;
}

export interface AgentExecution {
  id: string;
  agent_key: string;
  agent_name: string;
  area: string;
  status: string;
  action: string | null;
  summary: string | null;
  error: string | null;
  channel: string | null;
  duration_ms: number | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export function useAgentActivity() {
  const [agents, setAgents] = useState<AgentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("agent_activity" as any)
      .select("*")
      .order("agent_name");

    if (!error && data) {
      setAgents(data as unknown as AgentActivity[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAgents();

    const channel = supabase
      .channel("agent_activity_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_activity" },
        () => {
          fetchAgents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAgents]);

  return { agents, loading, refetch: fetchAgents };
}

export function useAgentExecutionHistory(agentKey: string | null, limit = 20) {
  const [executions, setExecutions] = useState<AgentExecution[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!agentKey) {
      setExecutions([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("agent_execution_history" as any)
      .select("*")
      .eq("agent_key", agentKey)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data) {
      setExecutions(data as unknown as AgentExecution[]);
    }
    setLoading(false);
  }, [agentKey, limit]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { executions, loading, refetch: fetchHistory };
}
