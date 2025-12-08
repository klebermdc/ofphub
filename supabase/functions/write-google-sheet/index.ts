import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Sheets API helper
async function getGoogleAuth() {
  const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
  if (!serviceAccountKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  }

  const credentials = JSON.parse(serviceAccountKey);
  
  // Create JWT for Google API authentication
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  // Base64URL encode
  const base64UrlEncode = (obj: unknown) => {
    const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
    const base64 = btoa(str);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const headerEncoded = base64UrlEncode(header);
  const claimEncoded = base64UrlEncode(claim);
  const signatureInput = `${headerEncoded}.${claimEncoded}`;

  // Import private key and sign
  const privateKey = credentials.private_key;
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKey.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const signatureEncoded = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${signatureInput}.${signatureEncoded}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    console.error('Token response:', tokenData);
    throw new Error('Failed to get access token');
  }

  return tokenData.access_token;
}

function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

serve(async (req) => {
  console.log('Request method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header - JWT is already verified by Supabase when verify_jwt = true
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.log('No authorization header found');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract and decode JWT to get user info
    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length !== 3) {
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode JWT payload (already verified by Supabase)
    const payload = JSON.parse(atob(parts[1]));
    const userId = payload.sub;
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'No user in token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', userId);

    const { sheetUrl, action, data } = await req.json();

    if (!sheetUrl) {
      return new Response(
        JSON.stringify({ error: 'sheetUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      return new Response(
        JSON.stringify({ error: 'Invalid sheet URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sheet ID:', sheetId);
    console.log('Action:', action);

    const accessToken = await getGoogleAuth();
    console.log('Got access token');

    if (action === 'append') {
      // Append a new row to the sheet
      // data should be an object with the order fields
      const { cliente, data: dataVenda, pedido, venda, fornecedor, produto, comissao, comissaoTotal, porcentagemVendedor, comissaoVendedor, vendedor } = data;

      // Format values for the sheet
      const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const formatPercent = (value: number) => `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

      const values = [[
        cliente || '',
        dataVenda || new Date().toLocaleDateString('pt-BR'),
        pedido || '',
        formatCurrency(venda || 0),
        fornecedor || '',
        produto || '',
        formatPercent(comissao || 0),
        formatCurrency(comissaoTotal || 0),
        porcentagemVendedor ? `${porcentagemVendedor}%` : '',
        formatCurrency(comissaoVendedor || 0),
        vendedor || '',
      ]];

      console.log('Appending row:', values);

      const appendResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:K:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values }),
        }
      );

      const appendResult = await appendResponse.json();
      
      if (!appendResponse.ok) {
        console.error('Append error:', appendResult);
        throw new Error(appendResult.error?.message || 'Failed to append row');
      }

      console.log('Row appended successfully:', appendResult);

      return new Response(
        JSON.stringify({ success: true, result: appendResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update') {
      // Update a specific row
      // data should include rowIndex and the fields to update
      const { rowIndex, ...fields } = data;

      if (!rowIndex) {
        return new Response(
          JSON.stringify({ error: 'rowIndex is required for update' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get current row data first
      const getResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A${rowIndex}:K${rowIndex}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      const currentData = await getResponse.json();
      const currentRow = currentData.values?.[0] || [];

      // Merge with updates
      const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const formatPercent = (value: number) => `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

      const updatedRow = [
        fields.cliente ?? currentRow[0] ?? '',
        fields.data ?? currentRow[1] ?? '',
        fields.pedido ?? currentRow[2] ?? '',
        fields.venda !== undefined ? formatCurrency(fields.venda) : currentRow[3] ?? '',
        fields.fornecedor ?? currentRow[4] ?? '',
        fields.produto ?? currentRow[5] ?? '',
        fields.comissao !== undefined ? formatPercent(fields.comissao) : currentRow[6] ?? '',
        fields.comissaoTotal !== undefined ? formatCurrency(fields.comissaoTotal) : currentRow[7] ?? '',
        fields.porcentagemVendedor !== undefined ? `${fields.porcentagemVendedor}%` : currentRow[8] ?? '',
        fields.comissaoVendedor !== undefined ? formatCurrency(fields.comissaoVendedor) : currentRow[9] ?? '',
        fields.vendedor ?? currentRow[10] ?? '',
      ];

      console.log('Updating row', rowIndex, ':', updatedRow);

      const updateResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A${rowIndex}:K${rowIndex}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [updatedRow] }),
        }
      );

      const updateResult = await updateResponse.json();

      if (!updateResponse.ok) {
        console.error('Update error:', updateResult);
        throw new Error(updateResult.error?.message || 'Failed to update row');
      }

      console.log('Row updated successfully:', updateResult);

      return new Response(
        JSON.stringify({ success: true, result: updateResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "append" or "update"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
