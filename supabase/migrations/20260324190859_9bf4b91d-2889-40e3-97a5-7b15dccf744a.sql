-- Remove duplicates using inline date normalization
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, 
        COALESCE(pedido,''), 
        COALESCE(cliente,''), 
        vendedor, 
        venda,
        CASE 
          WHEN data ~ '^\d{4}-\d{1,2}-\d{1,2}$' THEN data
          WHEN data ~ '^\d{1,2}/\d{1,2}/\d{2,4}$' THEN
            CASE WHEN split_part(data,'/',3)::int < 100 
              THEN (2000 + split_part(data,'/',3)::int)::text || '-' || lpad(split_part(data,'/',2), 2, '0') || '-' || lpad(split_part(data,'/',1), 2, '0')
              ELSE split_part(data,'/',3) || '-' || lpad(split_part(data,'/',2), 2, '0') || '-' || lpad(split_part(data,'/',1), 2, '0')
            END
          ELSE data
        END
      ORDER BY sheet_row_index ASC
    ) as rn
  FROM orders
)
DELETE FROM orders WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);