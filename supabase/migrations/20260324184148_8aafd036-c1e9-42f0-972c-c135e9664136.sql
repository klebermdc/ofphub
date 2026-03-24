-- Remove duplicate orders, keeping only the one with the lowest sheet_row_index
-- for each unique combination of (pedido, cliente, vendedor, venda, data)
DELETE FROM orders o
WHERE EXISTS (
  SELECT 1 FROM orders o2
  WHERE o2.user_id = o.user_id
    AND o2.pedido IS NOT DISTINCT FROM o.pedido
    AND COALESCE(o2.cliente,'') = COALESCE(o.cliente,'')
    AND o2.vendedor = o.vendedor
    AND o2.venda = o.venda
    AND o2.data = o.data
    AND o2.sheet_row_index < o.sheet_row_index
);