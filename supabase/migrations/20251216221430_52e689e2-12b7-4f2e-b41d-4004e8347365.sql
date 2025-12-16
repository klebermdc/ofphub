-- Fix orders synchronization: Google Sheet column "PEDIDO" is not unique, so upsert by (user_id, pedido) fails.
-- We will sync using the sheet row index as a stable unique key per user.

ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_user_id_pedido_unique;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS sheet_row_index integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_user_id_sheet_row_unique'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
    ADD CONSTRAINT orders_user_id_sheet_row_unique UNIQUE (user_id, sheet_row_index);
  END IF;
END
$$;