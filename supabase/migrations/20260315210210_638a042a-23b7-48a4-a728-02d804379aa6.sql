ALTER TABLE public.agent_activity 
  ADD COLUMN IF NOT EXISTS health_level text DEFAULT 'healthy',
  ADD COLUMN IF NOT EXISTS health_reason text;