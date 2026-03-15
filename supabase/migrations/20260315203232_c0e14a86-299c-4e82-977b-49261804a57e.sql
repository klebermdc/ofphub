
-- 1. Create agent_execution_history table
CREATE TABLE IF NOT EXISTS public.agent_execution_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key text NOT NULL,
  agent_name text NOT NULL,
  area text NOT NULL,
  status text NOT NULL CHECK (status IN ('running', 'success', 'error', 'idle')),
  action text,
  summary text,
  error text,
  channel text,
  duration_ms integer,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_execution_history_agent_key ON public.agent_execution_history (agent_key);
CREATE INDEX IF NOT EXISTS idx_agent_execution_history_status ON public.agent_execution_history (status);
CREATE INDEX IF NOT EXISTS idx_agent_execution_history_created_at ON public.agent_execution_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_execution_history_agent_created ON public.agent_execution_history (agent_key, created_at DESC);

-- RLS
ALTER TABLE public.agent_execution_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view agent execution history"
  ON public.agent_execution_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage agent execution history"
  ON public.agent_execution_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_execution_history;

-- 2. Enrich agent_activity with persona columns
ALTER TABLE public.agent_activity
  ADD COLUMN IF NOT EXISTS persona text,
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS mission text,
  ADD COLUMN IF NOT EXISTS style text,
  ADD COLUMN IF NOT EXISTS experience_level text;
