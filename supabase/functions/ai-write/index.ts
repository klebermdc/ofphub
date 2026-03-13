import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_TABLES = ['orders', 'crm_leads', 'accounting_entries', 'commission_reports'];

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405);
  }

  try {
    // === AUTH ===
    const authHeader = req.headers.get('Authorization');
    const expectedToken = Deno.env.get('REPORT_API_KEY');
    if (!expectedToken) return jsonResponse({ error: 'REPORT_API_KEY not configured' }, 500);
    if (!authHeader?.startsWith('Bearer ') || authHeader.replace('Bearer ', '') !== expectedToken) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // === PARSE BODY ===
    const body = await req.json().catch(() => null);
    if (!body) return jsonResponse({ error: 'Invalid JSON body' }, 400);

    const { table, action, data, match } = body;

    // === VALIDATE TABLE ===
    if (!table || !ALLOWED_TABLES.includes(table)) {
      return jsonResponse({
        error: `Invalid table. Allowed: ${ALLOWED_TABLES.join(', ')}`,
      }, 400);
    }

    // === VALIDATE ACTION ===
    if (!action || !['insert', 'update', 'delete'].includes(action)) {
      return jsonResponse({ error: 'Invalid action. Allowed: insert, update, delete' }, 400);
    }

    // === VALIDATE DATA/MATCH ===
    if ((action === 'insert' || action === 'update') && (!data || typeof data !== 'object')) {
      return jsonResponse({ error: '"data" object is required for insert/update' }, 400);
    }

    if ((action === 'update' || action === 'delete') && (!match || typeof match !== 'object' || Object.keys(match).length === 0)) {
      return jsonResponse({ error: '"match" object with at least one field is required for update/delete' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // === EXECUTE ===
    let result;

    if (action === 'insert') {
      const rows = Array.isArray(data) ? data : [data];
      result = await supabase.from(table).insert(rows).select();
    } else if (action === 'update') {
      let query = supabase.from(table).update(data);
      for (const [key, value] of Object.entries(match!)) {
        query = query.eq(key, value as string);
      }
      result = await query.select();
    } else if (action === 'delete') {
      let query = supabase.from(table).delete();
      for (const [key, value] of Object.entries(match!)) {
        query = query.eq(key, value as string);
      }
      result = await query.select();
    }

    if (result?.error) {
      return jsonResponse({
        success: false,
        error: result.error.message,
        details: result.error.details,
        hint: result.error.hint,
      }, 400);
    }

    return jsonResponse({
      success: true,
      action,
      table,
      affected_rows: result?.data?.length || 0,
      data: result?.data || [],
    });
  } catch (error) {
    console.error('Error in ai-write:', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});
