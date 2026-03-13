import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_TABLES = ['orders', 'crm_leads', 'accounting_entries', 'commission_reports', 'salesperson_discounts'];

/**
 * Parse various date formats into ISO YYYY-MM-DD.
 * Supports: D/M/YY, DD/MM/YY, D/M/YYYY, DD/MM/YYYY, YYYY-MM-DD
 */
function normalizeDateToISO(dateStr: string): string {
  if (!dateStr) return dateStr;
  const trimmed = dateStr.trim();

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed)) {
    const [d, m, rawY] = trimmed.split('/').map(Number);
    const y = rawY < 100 ? 2000 + rawY : rawY;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  return dateStr;
}

/** Normalize date fields in data before writing to DB */
function normalizeDataDates(table: string, data: any): any {
  if (!data || typeof data !== 'object') return data;
  const dateFields: Record<string, string[]> = {
    orders: ['data'],
    commission_orders: ['data'],
  };
  const fields = dateFields[table];
  if (!fields) return data;
  
  const normalized = { ...data };
  for (const field of fields) {
    if (normalized[field] && typeof normalized[field] === 'string') {
      normalized[field] = normalizeDateToISO(normalized[field]);
    }
  }
  return normalized;
}

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

    // === RESOLVE user_id FOR salesperson_discounts ===
    if (table === 'salesperson_discounts' && (action === 'insert' || action === 'update')) {
      const resolve = async (row: any) => {
        if (!row.user_id && row.salesperson_name) {
          // Lookup user_id from profiles by matching salesperson_name to full_name or email
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .or(`full_name.ilike.%${row.salesperson_name}%,email.ilike.%${row.salesperson_name}%`)
            .limit(1)
            .single();
          if (profile) {
            row.user_id = profile.id;
          } else {
            // Try user_roles table as fallback
            const { data: role } = await supabase
              .from('user_roles')
              .select('user_id')
              .ilike('salesperson_name', `%${row.salesperson_name}%`)
              .limit(1)
              .single();
            if (role) {
              row.user_id = role.user_id;
            }
          }
          if (!row.user_id) {
            throw new Error(`Could not resolve user_id for salesperson_name "${row.salesperson_name}". No matching profile found.`);
          }
        }
        return row;
      };

      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          data[i] = await resolve(data[i]);
        }
      } else {
        Object.assign(data, await resolve({ ...data }));
      }
    }

    // === EXECUTE ===
    let result;

    if (action === 'insert') {
      const rawRows = Array.isArray(data) ? data : [data];
      const rows = rawRows.map(r => normalizeDataDates(table, r));
      result = await supabase.from(table).insert(rows).select();
    } else if (action === 'update') {
      const normalizedData = normalizeDataDates(table, data);
      let query = supabase.from(table).update(normalizedData);
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
