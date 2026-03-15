
CREATE TABLE public.agent_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  agent_key text NOT NULL,
  area text NOT NULL DEFAULT 'geral',
  status text NOT NULL DEFAULT 'idle',
  last_action text,
  last_summary text,
  last_run_at timestamp with time zone,
  next_run_at timestamp with time zone,
  last_duration_ms integer,
  last_error text,
  last_channel text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_activity_agent_name ON public.agent_activity (agent_name);
CREATE INDEX idx_agent_activity_status ON public.agent_activity (status);
CREATE INDEX idx_agent_activity_updated_at ON public.agent_activity (updated_at DESC);
CREATE UNIQUE INDEX idx_agent_activity_agent_key ON public.agent_activity (agent_key);

ALTER TABLE public.agent_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view agent activity"
  ON public.agent_activity FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage agent activity"
  ON public.agent_activity FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_activity;
