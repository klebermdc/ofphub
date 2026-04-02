ALTER TABLE public.orders ADD COLUMN guia text NULL;
ALTER TABLE public.orders ADD COLUMN comissao_guia numeric NOT NULL DEFAULT 0;