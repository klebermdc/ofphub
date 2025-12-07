import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INTER_API_URL = 'https://cdpj.partners.bancointer.com.br';

// Normalize PEM format - restore newlines that may have been lost
function normalizePem(pem: string): string {
  // If already has proper newlines, return as is
  if (pem.includes('\n')) {
    return pem;
  }
  
  // Replace literal \n with actual newlines
  let normalized = pem.replace(/\\n/g, '\n');
  
  // If still no newlines, try to format the PEM properly
  if (!normalized.includes('\n')) {
    // Match the header, content, and footer
    const match = normalized.match(/(-----BEGIN [A-Z ]+-----)(.*)(-----END [A-Z ]+-----)/);
    if (match) {
      const header = match[1];
      const content = match[2];
      const footer = match[3];
      
      // Split content into 64-character lines
      const lines = content.match(/.{1,64}/g) || [];
      normalized = header + '\n' + lines.join('\n') + '\n' + footer + '\n';
    }
  }
  
  return normalized;
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('INTER_CLIENT_ID');
  const clientSecret = Deno.env.get('INTER_CLIENT_SECRET');
  const rawCertificate = Deno.env.get('INTER_CERTIFICATE');
  const rawCertificateKey = Deno.env.get('INTER_CERTIFICATE_KEY');

  if (!clientId || !clientSecret || !rawCertificate || !rawCertificateKey) {
    throw new Error('Credenciais do Banco Inter não configuradas');
  }

  // Normalize certificates to ensure proper PEM format
  const certificate = normalizePem(rawCertificate);
  const certificateKey = normalizePem(rawCertificateKey);

  console.log('Obtendo token de acesso do Banco Inter...');
  console.log('Certificate starts with:', certificate.substring(0, 50));
  console.log('Certificate has newlines:', certificate.includes('\n'));

  // Create HTTP client with mTLS
  const client = Deno.createHttpClient({
    cert: certificate,
    key: certificateKey,
  });

  const tokenUrl = 'https://cdpj.partners.bancointer.com.br/oauth/v2/token';
  
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'extrato.read boleto-cobranca.read boleto-cobranca.write',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    client,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro ao obter token:', errorText);
    throw new Error(`Erro ao obter token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Token obtido com sucesso');
  return data.access_token;
}

async function getSaldo(accessToken: string): Promise<unknown> {
  const rawCertificate = Deno.env.get('INTER_CERTIFICATE');
  const rawCertificateKey = Deno.env.get('INTER_CERTIFICATE_KEY');

  const certificate = normalizePem(rawCertificate!);
  const certificateKey = normalizePem(rawCertificateKey!);

  const client = Deno.createHttpClient({
    cert: certificate,
    key: certificateKey,
  });

  const today = new Date().toISOString().split('T')[0];
  const url = `${INTER_API_URL}/banking/v2/saldo?dataSaldo=${today}`;

  console.log('Consultando saldo do Banco Inter...');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    client,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro ao consultar saldo:', errorText);
    throw new Error(`Erro ao consultar saldo: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Saldo obtido com sucesso:', data);
  return data;
}

async function getExtrato(accessToken: string, dataInicio: string, dataFim: string): Promise<unknown> {
  const rawCertificate = Deno.env.get('INTER_CERTIFICATE');
  const rawCertificateKey = Deno.env.get('INTER_CERTIFICATE_KEY');

  const certificate = normalizePem(rawCertificate!);
  const certificateKey = normalizePem(rawCertificateKey!);

  const client = Deno.createHttpClient({
    cert: certificate,
    key: certificateKey,
  });

  const url = `${INTER_API_URL}/banking/v2/extrato?dataInicio=${dataInicio}&dataFim=${dataFim}`;

  console.log(`Consultando extrato de ${dataInicio} a ${dataFim}...`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    client,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro ao consultar extrato:', errorText);
    throw new Error(`Erro ao consultar extrato: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Extrato obtido com sucesso, transações:', data.transacoes?.length || 0);
  return data;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, dataInicio, dataFim } = await req.json();
    
    console.log(`Ação solicitada: ${action}`);

    const accessToken = await getAccessToken();

    let result;

    switch (action) {
      case 'saldo':
        result = await getSaldo(accessToken);
        break;
      case 'extrato':
        if (!dataInicio || !dataFim) {
          throw new Error('dataInicio e dataFim são obrigatórios para consultar extrato');
        }
        result = await getExtrato(accessToken, dataInicio, dataFim);
        break;
      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro na função banco-inter:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
