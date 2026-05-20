
-- Orders: tracking fields for Meta CAPI
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fbc text,
  ADD COLUMN IF NOT EXISTS fbp text,
  ADD COLUMN IF NOT EXISTS client_ip text,
  ADD COLUMN IF NOT EXISTS client_user_agent text,
  ADD COLUMN IF NOT EXISTS telefone_cliente text,
  ADD COLUMN IF NOT EXISTS meta_event_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS meta_event_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS meta_event_error text;

-- CRM leads: tracking fields captured from LP
ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS fbc text,
  ADD COLUMN IF NOT EXISTS fbp text,
  ADD COLUMN IF NOT EXISTS client_ip text,
  ADD COLUMN IF NOT EXISTS client_user_agent text;

-- Log table for Meta CAPI events
CREATE TABLE IF NOT EXISTS public.meta_capi_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  event_id text NOT NULL,
  event_name text NOT NULL DEFAULT 'Purchase',
  event_time timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  http_status int,
  request_payload jsonb,
  response_payload jsonb,
  error text,
  attempt int NOT NULL DEFAULT 1,
  test_mode boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_capi_events_order ON public.meta_capi_events(order_id);
CREATE INDEX IF NOT EXISTS idx_meta_capi_events_event_id ON public.meta_capi_events(event_id);
CREATE INDEX IF NOT EXISTS idx_meta_capi_events_created ON public.meta_capi_events(created_at DESC);

ALTER TABLE public.meta_capi_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view meta capi events"
  ON public.meta_capi_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Service role manages meta capi events"
  ON public.meta_capi_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
