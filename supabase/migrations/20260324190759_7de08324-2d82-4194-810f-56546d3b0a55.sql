-- Remove duplicate orders where normalized dates match but raw date strings differ
-- Keep the record with the lowest sheet_row_index
DELETE FROM orders o
WHERE o.id IN (
  SELECT o1.id
  FROM orders o1
  JOIN orders o2 
    ON o1.user_id = o2.user_id
    AND o1.pedido IS NOT DISTINCT FROM o2.pedido
    AND COALESCE(o1.cliente,'') = COALESCE(o2.cliente,'')
    AND o1.vendedor = o2.vendedor
    AND o1.venda = o2.venda
    AND normalize_date_to_iso(o1.data) = normalize_date_to_iso(o2.data)
    AND o1.sheet_row_index > o2.sheet_row_index
    AND o1.id != o2.id
);