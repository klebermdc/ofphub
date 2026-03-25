import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_TABLES = [
  'orders', 'crm_leads', 'accounting_entries', 'commission_reports', 'salesperson_discounts',
  'marketing_costs', 'marketing_files', 'commission_orders', 'commission_payments',
  'salesperson_goals', 'salesperson_salaries', 'api_integrations', 'nfse_history',
  'profiles', 'user_roles', 'user_sheet_settings', 'sales_goals', 'agent_activity',
  'agent_execution_history', 'agent_reports',
];

/** Map incoming field names to actual DB column names per table */
const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  marketing_costs: {
    other: 'other_marketing',
    valor: 'meta_ads',       // fallback; overridden by platform logic below
    value: 'meta_ads',
    amount: 'meta_ads',
    cost: 'meta_ads',
  },
};

/** Platform-to-column mapping for marketing_costs */
const PLATFORM_COLUMN_MAP: Record<string, string> = {
  'meta ads': 'meta_ads',
  'meta': 'meta_ads',
  'facebook': 'meta_ads',
  'facebook ads': 'meta_ads',
  'instagram': 'meta_ads',
  'google ads': 'google_ads',
  'google': 'google_ads',
  'tiktok ads': 'other_marketing',
  'tiktok': 'other_marketing',
  'outros': 'other_marketing',
  'other': 'other_marketing',
};

/**
 * For marketing_costs, if the agent sends { platform, amount/value/valor },
 * route the monetary value to the correct column (meta_ads, google_ads, other_marketing).
 */
function resolveMarketingCostFields(row: any): any {
  const platform = (row.platform || row.plataforma || '').toString().trim().toLowerCase();
  const amountValue = row.amount ?? row.value ?? row.valor ?? row.cost ?? null;

  if (amountValue !== null && platform) {
    const targetColumn = PLATFORM_COLUMN_MAP[platform] || 'other_marketing';
    row[targetColumn] = Number(amountValue);

    // Clean up source fields
    delete row.amount;
    delete row.value;
    delete row.valor;
    delete row.cost;
    delete row.platform;
    delete row.plataforma;
  } else if (amountValue !== null && !platform) {
    // No platform specified — default to other_marketing
    row.other_marketing = Number(amountValue);
    delete row.amount;
    delete row.value;
    delete row.valor;
    delete row.cost;
  }

  return row;
}

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
    if (!action || !['insert', 'update', 'delete', 'upsert'].includes(action)) {
      return jsonResponse({ error: 'Invalid action. Allowed: insert, update, delete, upsert' }, 400);
    }

    // === VALIDATE DATA/MATCH ===
    if ((action === 'insert' || action === 'update' || action === 'upsert') && (!data || typeof data !== 'object')) {
      return jsonResponse({ error: '"data" object is required for insert/update/upsert' }, 400);
    }

    if ((action === 'update' || action === 'delete') && (!match || typeof match !== 'object' || Object.keys(match).length === 0)) {
      return jsonResponse({ error: '"match" object with at least one field is required for update/delete' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // === AUTO-FILL user_id AND AUTO-CALC FOR orders ===
    if (table === 'orders' && (action === 'insert' || action === 'upsert')) {
      // Vendedor commission percentage mapping
      const VENDEDOR_PERCENT: Record<string, number> = {
        'Renata Santos': 20,
        'Carolina': 20,
        'Gabriela': 20,
        'Kleber Augusto': 20,
        'Marcella Freitas Soares Bastos': 20,
        'Pedro Lima': 20,
        'Rafael': 20,
        'Suelen Reame': 20,
      };

      const processOrder = async (row: any) => {
        // Auto-fill user_id from manager account
        if (!row.user_id) {
          const { data: authData } = await supabase.auth.admin.listUsers();
          const systemUser = authData?.users?.find(
            (u: any) => u.email?.toLowerCase() === 'comercial@orlandofastpass.com.br'
          );
          if (systemUser) {
            row.user_id = systemUser.id;
          } else {
            throw new Error('Could not resolve system user_id for orders.');
          }
        }

        // Auto-calculate commissions if venda and comissao % are provided
        const venda = Number(row.venda) || 0;
        const comissaoPct = Number(row.comissao) || 0;
        const comissaoTotal = venda * (comissaoPct / 100);
        row.comissao_total = Number(comissaoTotal.toFixed(2));

        // Determine vendedor percentage
        const vendedor = row.vendedor || '';
        const pctVendedor = row.porcentagem_vendedor ?? VENDEDOR_PERCENT[vendedor] ?? 20;
        row.porcentagem_vendedor = pctVendedor;
        row.comissao_vendedor = Number((comissaoTotal * (pctVendedor / 100)).toFixed(2));

        // Default status
        if (!row.status) row.status = 'Pendente';

        return row;
      };

      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          data[i] = await processOrder(data[i]);
        }
      } else {
        Object.assign(data, await processOrder({ ...data }));
      }
    }

    // === AUTO-FILL user_id FOR marketing_costs ===
    if (table === 'marketing_costs' && (action === 'insert' || action === 'update')) {
      const fillUserId = async (row: any) => {
        if (!row.user_id) {
          const { data: authData } = await supabase.auth.admin.listUsers();
          const systemUser = authData?.users?.find(
            (u: any) => u.email?.toLowerCase() === 'comercial@orlandofastpass.com.br'
          );
          if (systemUser) {
            row.user_id = systemUser.id;
          } else {
            throw new Error('Could not resolve system user_id for marketing_costs. No user found with email comercial@orlandofastpass.com.br');
          }
        }
        return row;
      };

      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          data[i] = await fillUserId(data[i]);
        }
      } else {
        Object.assign(data, await fillUserId({ ...data }));
      }
    }

    // === RESOLVE user_id FOR salesperson_discounts ===
    if (table === 'salesperson_discounts' && (action === 'insert' || action === 'update')) {
      const resolve = async (row: any) => {
        // Lookup by salesperson_email first (direct auth.users lookup)
        if (!row.user_id && row.salesperson_email) {
          const { data: authData } = await supabase.auth.admin.listUsers();
          const matchedUser = authData?.users?.find(
            (u: any) => u.email?.toLowerCase() === row.salesperson_email.toLowerCase()
          );
          if (matchedUser) {
            row.user_id = matchedUser.id;
          }
          if (!row.user_id) {
            throw new Error(`Could not resolve user_id for salesperson_email "${row.salesperson_email}". No matching auth user found.`);
          }
        }
        // Fallback: lookup by salesperson_name
        if (!row.user_id && row.salesperson_name) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .or(`full_name.ilike.%${row.salesperson_name}%,email.ilike.%${row.salesperson_name}%`)
            .limit(1)
            .single();
          if (profile) {
            row.user_id = profile.id;
          } else {
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

    // === APPLY FIELD MAPPINGS ===
    const applyMappings = (row: any) => {
      const mappings = FIELD_MAPPINGS[table];
      if (!mappings) return row;
      const mapped = { ...row };
      for (const [from, to] of Object.entries(mappings)) {
        if (from in mapped && !(to in mapped)) {
          mapped[to] = mapped[from];
          delete mapped[from];
        }
      }
      return mapped;
    };

    if (data && typeof data === 'object') {
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          data[i] = applyMappings(data[i]);
        }
      } else {
        Object.assign(data, applyMappings({ ...data }));
        // clean old keys
        const mappings = FIELD_MAPPINGS[table];
        if (mappings) {
          for (const from of Object.keys(mappings)) {
            if (from in data && from !== mappings[from]) delete data[from];
          }
        }
      }
    }

    // === EXECUTE ===
    let result;

    if (action === 'insert') {
      const rawRows = Array.isArray(data) ? data : [data];
      const rows = rawRows.map(r => normalizeDataDates(table, r));
      result = await supabase.from(table).insert(rows).select();
    } else if (action === 'upsert') {
      const rawRows = Array.isArray(data) ? data : [data];
      const rows = rawRows.map(r => normalizeDataDates(table, r));
      const onConflict = body.on_conflict || undefined;
      result = await supabase.from(table).upsert(rows, { onConflict }).select();
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
