
-- 1. Corrigir valor do registro com dados corretos do Meta Ads
UPDATE public.marketing_costs
SET meta_ads = 15802.34,
    description = 'Meta Ads - Corrigido manualmente | 2026-03-26 | Impressões: 585992 | Cliques: 15247 | CTR: 2.00% | CPC: R$1.04',
    updated_at = now()
WHERE id = '3999ca66-368e-4cba-9aca-4038f068f2ac';

-- 2. Criar tabela de audit log
CREATE TABLE public.marketing_costs_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id uuid NOT NULL,
    changed_at timestamptz NOT NULL DEFAULT now(),
    changed_by uuid,
    operation text NOT NULL,
    old_values jsonb,
    new_values jsonb
);

ALTER TABLE public.marketing_costs_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view audit log"
ON public.marketing_costs_audit FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

-- 3. Criar trigger function
CREATE OR REPLACE FUNCTION public.audit_marketing_costs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.marketing_costs_audit (record_id, changed_by, operation, old_values, new_values)
        VALUES (NEW.id, auth.uid(), 'INSERT', NULL, to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.marketing_costs_audit (record_id, changed_by, operation, old_values, new_values)
        VALUES (NEW.id, auth.uid(), 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.marketing_costs_audit (record_id, changed_by, operation, old_values, new_values)
        VALUES (OLD.id, auth.uid(), 'DELETE', to_jsonb(OLD), NULL);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- 4. Attach trigger
CREATE TRIGGER trg_audit_marketing_costs
AFTER INSERT OR UPDATE OR DELETE ON public.marketing_costs
FOR EACH ROW EXECUTE FUNCTION public.audit_marketing_costs();
