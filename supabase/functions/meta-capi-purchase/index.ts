// Meta Conversions API - Purchase event
// Sends a Purchase event to Meta when an order is created in the OFP Hub.
// Enriches the user_data with fbc/fbp captured from the matching crm_lead.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const META_PIXEL_ID = '343648994758202';
const META_API_VERSION = 'v21.0';
const GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events`;

// SHA-256 of a normalized string
async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizePhoneE164BR(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('55')) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

function splitName(full: string | null | undefined): { fn: string | null; ln: string | null } {
  if (!full) return { fn: null, ln: null };
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { fn: parts[0], ln: null };
  return { fn: parts[0], ln: parts.slice(1).join(' ') };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const ACCESS_TOKEN = Deno.env.get('META_CAPI_ACCESS_TOKEN');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const REPORT_API_KEY = Deno.env.get('REPORT_API_KEY');

  if (!ACCESS_TOKEN || !SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing server config' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Auth: accept any logged-in user (anon key + session header) OR REPORT_API_KEY bearer
  const authHeader = req.headers.get('Authorization') || '';
  const bearer = authHeader.replace(/^Bearer\s+/i, '');
  const isApiKey = REPORT_API_KEY && bearer === REPORT_API_KEY;

  if (!isApiKey) {
    // Validate user JWT
    const anonClient = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(bearer);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: { order_id?: string; test_event_code?: string } = {};
  try { body = await req.json(); } catch { /* */ }
  const { order_id, test_event_code } = body;

  if (!order_id) {
    return new Response(JSON.stringify({ error: 'order_id required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Load order
  const { data: order, error: orderErr } = await supabase
    .from('orders').select('*').eq('id', order_id).maybeSingle();

  if (orderErr || !order) {
    return new Response(JSON.stringify({ error: 'Order not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Try to enrich from matching crm_lead (by email or phone)
  let lead: any = null;
  if (order.email_cliente) {
    const { data } = await supabase
      .from('crm_leads')
      .select('fbc, fbp, client_ip, client_user_agent, phone, email, name')
      .ilike('email', order.email_cliente.trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    lead = data;
  }
  if (!lead && order.telefone_cliente) {
    const digits = order.telefone_cliente.replace(/\D/g, '').slice(-9);
    if (digits.length >= 8) {
      const { data } = await supabase
        .from('crm_leads')
        .select('fbc, fbp, client_ip, client_user_agent, phone, email, name')
        .ilike('phone', `%${digits}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      lead = data;
    }
  }

  const fbc = order.fbc || lead?.fbc || null;
  const fbp = order.fbp || lead?.fbp || null;
  const clientIp = order.client_ip || lead?.client_ip || null;
  const clientUa = order.client_user_agent || lead?.client_user_agent || null;
  const email = (order.email_cliente || lead?.email || '').trim();
  const phoneE164 = normalizePhoneE164BR(order.telefone_cliente || lead?.phone);
  const { fn, ln } = splitName(order.cliente || lead?.name);

  // Build hashed user_data
  const user_data: Record<string, any> = {};
  if (email) user_data.em = [await sha256(email)];
  if (phoneE164) user_data.ph = [await sha256(phoneE164)];
  if (fn) user_data.fn = [await sha256(fn)];
  if (ln) user_data.ln = [await sha256(ln)];
  if (fbc) user_data.fbc = fbc;
  if (fbp) user_data.fbp = fbp;
  if (clientIp) user_data.client_ip_address = clientIp;
  if (clientUa) user_data.client_user_agent = clientUa;

  const eventTime = Math.floor(new Date(order.created_at).getTime() / 1000) || Math.floor(Date.now() / 1000);

  const payload: Record<string, any> = {
    data: [{
      event_name: 'Purchase',
      event_time: eventTime,
      event_id: order.id, // idempotency key
      action_source: 'system_generated',
      user_data,
      custom_data: {
        currency: 'BRL',
        value: Number(order.venda || 0),
        content_name: order.produto || undefined,
        content_ids: order.pedido ? [order.pedido] : undefined,
        order_id: order.pedido || order.id,
      },
    }],
  };
  if (test_event_code) payload.test_event_code = test_event_code;

  // Fire to Meta
  let metaResp: any = null;
  let httpStatus = 0;
  let errorMsg: string | null = null;
  try {
    const resp = await fetch(`${GRAPH_URL}?access_token=${ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    httpStatus = resp.status;
    metaResp = await resp.json().catch(() => ({}));
    if (!resp.ok) errorMsg = metaResp?.error?.message || `HTTP ${resp.status}`;
  } catch (e: any) {
    errorMsg = e?.message || String(e);
  }

  const success = !errorMsg;
  const status = success ? 'sent' : 'failed';

  // Log to meta_capi_events
  await supabase.from('meta_capi_events').insert({
    order_id: order.id,
    event_id: order.id,
    event_name: 'Purchase',
    status,
    http_status: httpStatus,
    request_payload: payload,
    response_payload: metaResp,
    error: errorMsg,
    test_mode: !!test_event_code,
  });

  // Update order
  await supabase.from('orders').update({
    meta_event_status: status,
    meta_event_sent_at: success ? new Date().toISOString() : null,
    meta_event_error: errorMsg,
  }).eq('id', order.id);

  return new Response(JSON.stringify({
    success, status, http_status: httpStatus, response: metaResp, error: errorMsg,
  }), {
    status: success ? 200 : 502,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
