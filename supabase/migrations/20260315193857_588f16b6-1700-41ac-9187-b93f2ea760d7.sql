
-- Add CHECK constraint on status (table already exists)
ALTER TABLE public.agent_activity DROP CONSTRAINT IF EXISTS agent_activity_status_check;
ALTER TABLE public.agent_activity ADD CONSTRAINT agent_activity_status_check CHECK (status IN ('idle', 'running', 'success', 'error'));

-- Add area index (other indexes already exist)
CREATE INDEX IF NOT EXISTS idx_agent_activity_area ON public.agent_activity (area);
