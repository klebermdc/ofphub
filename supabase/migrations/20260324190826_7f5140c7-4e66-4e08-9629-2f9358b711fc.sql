-- Direct deletion: for each group of orders with same normalized data, keep only the one with lowest sheet_row_index
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, pedido, COALESCE(cliente,''), vendedor, venda, normalize_date_to_iso(data)
      ORDER BY sheet_row_index ASC
    ) as rn
  FROM orders
  WHERE user_id = '7fe205d8-9622-43fc-be97-09af9f9157fa'
)
DELETE FROM orders WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);