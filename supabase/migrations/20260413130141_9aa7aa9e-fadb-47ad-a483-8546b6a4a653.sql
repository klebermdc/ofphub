CREATE TABLE IF NOT EXISTS public.growth_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 2023),
  revenue numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(month, year)
);

ALTER TABLE public.growth_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read growth metrics" ON public.growth_metrics FOR SELECT USING (true);

CREATE POLICY "Anyone can insert growth metrics" ON public.growth_metrics FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update growth metrics" ON public.growth_metrics FOR UPDATE USING (true) WITH CHECK (true);

INSERT INTO public.growth_metrics (month, year, revenue) VALUES
  (1, 2023, 679401.75), (2, 2023, 631621.83), (3, 2023, 1046526.00), (4, 2023, 820242.55),
  (5, 2023, 505785.71), (6, 2023, 866759.67), (7, 2023, 704841.00), (8, 2023, 1379642.11),
  (9, 2023, 786811.00), (10, 2023, 1079781.00), (11, 2023, 1379235.21), (12, 2023, 738787.00),
  (1, 2024, 910252.15), (2, 2024, 675578.45), (3, 2024, 669389.18), (4, 2024, 469403.89),
  (5, 2024, 453097.43), (6, 2024, 574266.95), (7, 2024, 1022738.00), (8, 2024, 1766984.37),
  (9, 2024, 2326532.00), (10, 2024, 2039027.07), (11, 2024, 2061336.98), (12, 2024, 1716357.94),
  (1, 2025, 1802301.00), (2, 2025, 3556194.00), (3, 2025, 2020337.00), (4, 2025, 1896117.00),
  (5, 2025, 1904401.96), (6, 2025, 2030506.90), (7, 2025, 2694068.24), (8, 2025, 1834512.25),
  (9, 2025, 2761901.67), (10, 2025, 2780891.92), (11, 2025, 3288409.30),
  (1, 2026, 3267573.00), (2, 2026, 2434395.00), (3, 2026, 2034546.00), (4, 2026, 2768292.00)
ON CONFLICT (month, year) DO UPDATE SET revenue = EXCLUDED.revenue;