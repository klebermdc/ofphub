-- Tabela para histórico de NFS-e emitidas
CREATE TABLE public.nfse_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  numero_nfse TEXT,
  codigo_verificacao TEXT,
  rps_numero TEXT NOT NULL,
  rps_serie TEXT NOT NULL,
  data_emissao DATE NOT NULL,
  ambiente TEXT NOT NULL DEFAULT 'homologacao',
  status TEXT NOT NULL DEFAULT 'emitida',
  
  -- Dados do tomador
  tomador_cpf_cnpj TEXT NOT NULL,
  tomador_razao_social TEXT NOT NULL,
  tomador_email TEXT,
  
  -- Dados do serviço
  codigo_servico TEXT NOT NULL,
  discriminacao TEXT NOT NULL,
  valor_servico NUMERIC NOT NULL DEFAULT 0,
  aliquota NUMERIC NOT NULL DEFAULT 0,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nfse_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own NFS-e history"
ON public.nfse_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own NFS-e"
ON public.nfse_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own NFS-e"
ON public.nfse_history
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_nfse_history_updated_at
BEFORE UPDATE ON public.nfse_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();