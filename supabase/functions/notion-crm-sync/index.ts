import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const MAX_NAME_LENGTH = 200;
const MAX_PHONE_LENGTH = 30;
const MAX_EMAIL_LENGTH = 255;
const MAX_NOTES_LENGTH = 5000;
const MAX_PAGES = 500;

// Mapping of Notion Status to CRM Stage
const statusToStage: Record<string, string> = {
  'Coletando informações': 'coletando_informacao',
  'Proposta enviada': 'proposta_enviada',
  'Venda Realizada': 'venda_concluida',
  'Venda Perdida': 'venda_perdida',
  'Descadastrar': 'venda_perdida',
  'Aguardando Atendente': 'novo_lead',
  'Não respondeu': 'coletando_informacao',
  'Não tem Data': 'novo_lead',
  'JOY': 'novo_lead',
  'Guia': 'proposta_enviada',
  'Gabi': 'novo_lead',
  'Aguardando Emissão': 'proposta_enviada',
};

// Valid CRM stages
const VALID_STAGES = ['novo_lead', 'coletando_informacao', 'proposta_enviada', 'venda_concluida', 'venda_perdida'];

// Mapping of Notion Vendedor to normalized salesperson names
const vendedorMapping: Record<string, string> = {
  'Renata Santos': 'Renata',
  'Kleber Augusto': 'Kleber',
  'Carolina Lemos': 'Carolina',
  'Rafael': 'Rafael',
  'Suelen Reame': 'Suelen',
  'Simone Freitas': 'Simone',
  'Gabriela Gutierrez Ferrufino de Marcato': 'Gabriela',
  'Pedro Lima': 'Pedro',
  'JOY': 'JOY',
  'SRD': 'SRD',
  'Renata': 'Renata',
  'Suelen': 'Suelen',
  'Marcella Freitas Soares Bastos': 'Marcella',
};

interface NotionPage {
  id: string;
  created_time: string;
  last_edited_time: string;
  properties: {
    Nome?: { title: Array<{ plain_text: string }> };
    Telefone?: { phone_number: string };
    'E-mail'?: { email: string };
    Valor?: { rich_text: Array<{ plain_text: string }> };
    Vendedor?: { select: { name: string } | null };
    Status?: { select: { name: string } | null };
    Notas?: { rich_text: Array<{ plain_text: string }> };
    Produtos?: { multi_select: Array<{ name: string }> };
    'Data Geração Lead'?: { date: { start: string } | null };
  };
}

// Sanitize string to prevent injection
function sanitizeString(value: string | null | undefined, maxLength: number): string | null {
  if (!value || typeof value !== 'string') return null;
  return value.substring(0, maxLength).trim() || null;
}

// Validate and sanitize email
function sanitizeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.substring(0, MAX_EMAIL_LENGTH).trim().toLowerCase();
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) ? trimmed : null;
}

// Validate numeric value
function parseNumericValue(value: string | null | undefined): number {
  if (!value || typeof value !== 'string') return 0;
  const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  // Limit to reasonable range
  if (isNaN(parsed) || parsed < 0 || parsed > 999999999) return 0;
  return parsed;
}

function parseNotionPage(page: NotionPage) {
  const props = page.properties;
  
  // Extract and sanitize name
  const rawName = props.Nome?.title?.[0]?.plain_text;
  const name = sanitizeString(rawName, MAX_NAME_LENGTH) || 'Sem Nome';
  
  // Extract and sanitize phone
  const phone = sanitizeString(props.Telefone?.phone_number, MAX_PHONE_LENGTH);
  
  // Extract and validate email
  const email = sanitizeEmail(props['E-mail']?.email);
  
  // Extract and validate value
  const valorText = props.Valor?.rich_text?.[0]?.plain_text;
  const estimatedValue = parseNumericValue(valorText);
  
  // Extract and map vendedor
  const vendedorRaw = props.Vendedor?.select?.name || null;
  const salespersonName = vendedorRaw ? sanitizeString(vendedorMapping[vendedorRaw] || vendedorRaw, 100) : null;
  
  // Extract and validate status to stage mapping
  const statusRaw = props.Status?.select?.name || 'Aguardando Atendente';
  const mappedStage = statusToStage[statusRaw] || 'novo_lead';
  const stage = VALID_STAGES.includes(mappedStage) ? mappedStage : 'novo_lead';
  
  // Extract and sanitize notes
  const notes = sanitizeString(props.Notas?.rich_text?.[0]?.plain_text, MAX_NOTES_LENGTH);
  
  // Extract first product
  const product = sanitizeString(props.Produtos?.multi_select?.[0]?.name, 200);
  
  // Use 'Data Geração Lead' if available, otherwise use Notion's created_time
  const createdAt = props['Data Geração Lead']?.date?.start || page.created_time;
  
  // Use Notion's last_edited_time for tracking stage changes
  const lastEditedAt = page.last_edited_time;

  console.log(`Lead: ${name}, Created: ${createdAt}, Last Edited: ${lastEditedAt}`);

  return {
    notion_id: page.id,
    name,
    phone,
    email,
    estimated_value: estimatedValue,
    salesperson_name: salespersonName,
    stage,
    notes,
    product,
    created_at: createdAt,
    last_edited_at: lastEditedAt,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const notionApiKey = Deno.env.get('NOTION_API_KEY');

    if (!notionApiKey) {
      throw new Error('NOTION_API_KEY is not configured');
    }

    // Verify user authentication
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado - Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Authorization check: verify user has manager role
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: userRole, error: roleError } = await serviceSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (roleError || !userRole) {
      console.error('User role not found:', roleError);
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não possui permissão para esta operação' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (userRole.role !== 'manager') {
      console.error('Insufficient permissions. Role:', userRole.role);
      return new Response(
        JSON.stringify({ success: false, error: 'Apenas gerentes podem sincronizar com Notion' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('User authorized as manager');

    // Get request body
    const body = await req.json();
    const { user_id, database_id = '1e22d56c151b80c6bc3ac52cb35d539e' } = body;

    // Security check: user_id must match authenticated user or be omitted
    const targetUserId = user_id || user.id;
    if (user_id && user_id !== user.id) {
      console.error('User trying to sync for different user_id');
      return new Response(
        JSON.stringify({ success: false, error: 'Não é permitido sincronizar dados de outro usuário' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting Notion sync for user ${targetUserId}`);

    // Fetch pages from Notion database - only December onwards
    let allPages: NotionPage[] = [];
    let hasMore = true;
    let startCursor: string | undefined = undefined;

    // Add timeout for Notion API calls
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      while (hasMore && allPages.length < MAX_PAGES) {
        const requestBody: any = {
          page_size: 100,
          filter: {
            property: 'Data Geração Lead',
            date: {
              on_or_after: '2024-12-01'
            }
          },
          sorts: [
            {
              property: 'Data Geração Lead',
              direction: 'descending',
            },
          ],
        };

        if (startCursor) {
          requestBody.start_cursor = startCursor;
        }

        const notionResponse = await fetch(
          `https://api.notion.com/v1/databases/${database_id}/query`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${notionApiKey}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          }
        );

        if (!notionResponse.ok) {
          const errorText = await notionResponse.text();
          console.error('Notion API error:', errorText);
          throw new Error(`Notion API error: ${notionResponse.status}`);
        }

        const notionData = await notionResponse.json();
        const pages: NotionPage[] = notionData.results;
        
        allPages = allPages.concat(pages);
        hasMore = notionData.has_more && allPages.length < MAX_PAGES;
        startCursor = notionData.next_cursor;

        console.log(`Fetched ${pages.length} pages (total: ${allPages.length})`);
      }
    } finally {
      clearTimeout(timeoutId);
    }

    console.log(`Total pages fetched from Notion: ${allPages.length}`);

    // Parse all pages with validation
    const leads = allPages.map(parseNotionPage);

    // Get existing leads for this user to check for updates
    const { data: existingLeads, error: fetchError } = await serviceSupabase
      .from('crm_leads')
      .select('id, name, email, phone')
      .eq('user_id', targetUserId);

    if (fetchError) {
      console.error('Error fetching existing leads:', fetchError);
    }

    // Create a map of existing leads by name+email+phone for deduplication
    const existingMap = new Map();
    if (existingLeads) {
      existingLeads.forEach(lead => {
        const key = `${lead.name}-${lead.email || ''}-${lead.phone || ''}`;
        existingMap.set(key, lead.id);
      });
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    // Process each lead
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const key = `${lead.name}-${lead.email || ''}-${lead.phone || ''}`;
      const existingId = existingMap.get(key);

      if (existingId) {
        // Update existing lead
        const { error: updateError } = await serviceSupabase
          .from('crm_leads')
          .update({
            estimated_value: lead.estimated_value,
            salesperson_name: lead.salesperson_name,
            stage: lead.stage,
            notes: lead.notes,
            product: lead.product,
            notion_created_at: lead.created_at,
            updated_at: lead.last_edited_at, // Use Notion's last edited time
          })
          .eq('id', existingId);

        if (updateError) {
          console.error(`Error updating lead ${lead.name}:`, updateError);
          skipped++;
        } else {
          updated++;
        }
      } else {
        // Create new lead
        const { error: insertError } = await serviceSupabase
          .from('crm_leads')
          .insert({
            user_id: targetUserId,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            estimated_value: lead.estimated_value,
            salesperson_name: lead.salesperson_name,
            stage: lead.stage as any,
            notes: lead.notes,
            product: lead.product,
            notion_created_at: lead.created_at,
            updated_at: lead.last_edited_at, // Use Notion's last edited time
            position: i,
          });

        if (insertError) {
          console.error(`Error creating lead ${lead.name}:`, insertError);
          skipped++;
        } else {
          created++;
        }
      }
    }

    console.log(`Sync complete: ${created} created, ${updated} updated, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        total: leads.length,
        created,
        updated,
        skipped,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Sync error:', error);
    // Return generic error to avoid leaking internal details
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao sincronizar com Notion. Tente novamente.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
