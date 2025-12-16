-- Create unique constraint on orders for upsert by user_id + pedido
ALTER TABLE public.orders
ADD CONSTRAINT orders_user_id_pedido_unique UNIQUE (user_id, pedido);