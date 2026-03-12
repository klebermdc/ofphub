import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;

    // Get OpenClaw API Key from secrets
    const openclawApiKey = Deno.env.get('OPENCLAW_API_KEY');
    if (!openclawApiKey) {
      return new Response(JSON.stringify({ error: 'OPENCLAW_API_KEY não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, payload } = await req.json();

    if (!action) {
      return new Response(JSON.stringify({ error: 'Ação não especificada' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Route actions to OpenClaw API
    let openclawEndpoint = '';
    let openclawBody: Record<string, unknown> = {};

    switch (action) {
      case 'run_task':
        openclawEndpoint = '/v1/agents/run';
        openclawBody = {
          agent_id: payload?.agent_id,
          task: payload?.task,
          context: payload?.context || {},
        };
        break;

      case 'list_agents':
        openclawEndpoint = '/v1/agents';
        break;

      case 'get_status':
        openclawEndpoint = `/v1/agents/runs/${payload?.run_id}`;
        break;

      case 'cancel_task':
        openclawEndpoint = `/v1/agents/runs/${payload?.run_id}/cancel`;
        break;

      default:
        return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const openclawBaseUrl = Deno.env.get('OPENCLAW_BASE_URL') || 'https://api.openclaw.ai';
    const method = action === 'list_agents' || action === 'get_status' ? 'GET' : 'POST';

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${openclawApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (method === 'POST') {
      fetchOptions.body = JSON.stringify(openclawBody);
    }

    const response = await fetch(`${openclawBaseUrl}${openclawEndpoint}`, fetchOptions);
    const responseText = await response.text();

    if (!response.ok) {
      console.error(`OpenClaw API error [${response.status}]:`, responseText);
      return new Response(JSON.stringify({
        success: false,
        error: `OpenClaw retornou status ${response.status}`,
        details: responseText,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    // Log the action for auditing
    console.log(`OpenClaw action="${action}" user="${userId}" status=${response.status}`);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in openclaw-agent:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
