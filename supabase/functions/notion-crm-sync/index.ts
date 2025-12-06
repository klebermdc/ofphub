import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

function parseNotionPage(page: NotionPage) {
  const props = page.properties;
  
  // Extract name
  const name = props.Nome?.title?.[0]?.plain_text || 'Sem Nome';
  
  // Extract phone
  const phone = props.Telefone?.phone_number || null;
  
  // Extract email
  const email = props['E-mail']?.email || null;
  
  // Extract value and parse to number
  const valorText = props.Valor?.rich_text?.[0]?.plain_text || '0';
  const estimatedValue = parseFloat(valorText.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
  
  // Extract and map vendedor
  const vendedorRaw = props.Vendedor?.select?.name || null;
  const salespersonName = vendedorRaw ? (vendedorMapping[vendedorRaw] || vendedorRaw) : null;
  
  // Extract and map status to stage
  const statusRaw = props.Status?.select?.name || 'Aguardando Atendente';
  const stage = statusToStage[statusRaw] || 'novo_lead';
  
  // Extract notes
  const notes = props.Notas?.rich_text?.[0]?.plain_text || null;
  
  // Extract first product
  const product = props.Produtos?.multi_select?.[0]?.name || null;
  
  // Extract creation date
  const createdAt = props['Data Geração Lead']?.date?.start || null;

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
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const notionApiKey = Deno.env.get('NOTION_API_KEY');

    if (!notionApiKey) {
      throw new Error('NOTION_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const body = await req.json();
    const { user_id, database_id = '1e22d56c151b80c6bc3ac52cb35d539e' } = body;

    if (!user_id) {
      throw new Error('user_id is required');
    }

    console.log(`Starting Notion sync for user ${user_id}`);

    // Fetch all pages from Notion database
    const notionResponse = await fetch(
      `https://api.notion.com/v1/databases/${database_id}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionApiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page_size: 100,
          sorts: [
            {
              property: 'Data Geração Lead',
              direction: 'descending',
            },
          ],
        }),
      }
    );

    if (!notionResponse.ok) {
      const errorText = await notionResponse.text();
      console.error('Notion API error:', errorText);
      throw new Error(`Notion API error: ${notionResponse.status}`);
    }

    const notionData = await notionResponse.json();
    const pages: NotionPage[] = notionData.results;

    console.log(`Fetched ${pages.length} pages from Notion`);

    // Parse all pages
    const leads = pages.map(parseNotionPage);

    // Get existing leads for this user to check for updates
    const { data: existingLeads, error: fetchError } = await supabase
      .from('crm_leads')
      .select('id, name, email, phone')
      .eq('user_id', user_id);

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
        const { error: updateError } = await supabase
          .from('crm_leads')
          .update({
            estimated_value: lead.estimated_value,
            salesperson_name: lead.salesperson_name,
            stage: lead.stage,
            notes: lead.notes,
            product: lead.product,
            updated_at: new Date().toISOString(),
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
        const { error: insertError } = await supabase
          .from('crm_leads')
          .insert({
            user_id,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            estimated_value: lead.estimated_value,
            salesperson_name: lead.salesperson_name,
            stage: lead.stage as any,
            notes: lead.notes,
            product: lead.product,
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
