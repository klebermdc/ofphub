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
  health_level: string | null;
  health_reason: string | null;
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

export interface ExecutionStats24h {
  totalExecutions: number;
  totalErrors: number;
  topAgentByExecs: { agent_name: string; count: number } | null;
  topAgentByErrors: { agent_name: string; count: number } | null;
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

export function useAgentExecutionHistory(agentKey: string | null, limit = 30) {
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

export function useExecutionStats24h() {
  const [stats, setStats] = useState<ExecutionStats24h>({
    totalExecutions: 0,
    totalErrors: 0,
    topAgentByExecs: null,
    topAgentByErrors: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("agent_execution_history" as any)
      .select("agent_key, agent_name, status")
      .gte("created_at", since);

    if (!error && data) {
      const rows = data as unknown as AgentExecution[];
      const totalExecutions = rows.length;
      const totalErrors = rows.filter(r => r.status === "error").length;

      // count by agent
      const execCounts: Record<string, { name: string; count: number }> = {};
      const errorCounts: Record<string, { name: string; count: number }> = {};

      for (const row of rows) {
        if (!execCounts[row.agent_key]) execCounts[row.agent_key] = { name: row.agent_name, count: 0 };
        execCounts[row.agent_key].count++;
        if (row.status === "error") {
          if (!errorCounts[row.agent_key]) errorCounts[row.agent_key] = { name: row.agent_name, count: 0 };
          errorCounts[row.agent_key].count++;
        }
      }

      const topExec = Object.values(execCounts).sort((a, b) => b.count - a.count)[0] || null;
      const topError = Object.values(errorCounts).sort((a, b) => b.count - a.count)[0] || null;

      setStats({
        totalExecutions,
        totalErrors,
        topAgentByExecs: topExec ? { agent_name: topExec.name, count: topExec.count } : null,
        topAgentByErrors: topError ? { agent_name: topError.name, count: topError.count } : null,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
