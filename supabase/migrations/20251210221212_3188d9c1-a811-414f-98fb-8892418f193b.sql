-- Add email_cliente and status columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS email_cliente TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pendente';