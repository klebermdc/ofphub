
-- Create agent_reports table
CREATE TABLE public.agent_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key TEXT NOT NULL,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.agent_reports ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Authenticated users can view agent reports"
ON public.agent_reports FOR SELECT TO authenticated
USING (true);

-- Service role can do everything (used by ai-write with service_role_key)
CREATE POLICY "Service role can manage agent reports"
ON public.agent_reports FOR ALL TO service_role
USING (true) WITH CHECK (true);
