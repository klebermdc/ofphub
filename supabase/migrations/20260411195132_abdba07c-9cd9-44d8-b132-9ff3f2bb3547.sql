CREATE TABLE IF NOT EXISTS public.whatsapp_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  total_chats integer DEFAULT 0,
  chats_sem_vendedor integer DEFAULT 0,
  chats_by_agent jsonb DEFAULT '{}',
  chats_by_tag jsonb DEFAULT '{}',
  chats_by_stage jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(date)
);

ALTER TABLE public.whatsapp_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read whatsapp status" ON public.whatsapp_status FOR SELECT USING (true);
CREATE POLICY "Anyone can insert whatsapp status" ON public.whatsapp_status FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update whatsapp status" ON public.whatsapp_status FOR UPDATE USING (true) WITH CHECK (true);