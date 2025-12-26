import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const MAX_CART_TEXT_LENGTH = 50000; // 50KB
const MAX_CLIENT_NAME_LENGTH = 200;

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Sanitize string to prevent injection
function sanitizeString(value: string | null | undefined, maxLength: number): string {
  if (!value || typeof value !== 'string') return '';
  return value.substring(0, maxLength).trim();
}

// Validate parsed cart structure
function validateParsedCart(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  
  // Ensure arrays exist
  if (data.tickets && !Array.isArray(data.tickets)) return false;
  if (data.hotels && !Array.isArray(data.hotels)) return false;
  if (data.cars && !Array.isArray(data.cars)) return false;
  if (data.insurance && !Array.isArray(data.insurance)) return false;
  
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user authentication
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ error: 'Não autorizado - Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Authenticated user:', user.id);

    // Authorization check: verify user has manager or salesperson role
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: userRole, error: roleError } = await serviceSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (roleError || !userRole) {
      console.error('User role not found:', roleError);
      return new Response(JSON.stringify({ error: 'Usuário não possui permissão para esta operação' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (!['manager', 'salesperson'].includes(userRole.role)) {
      console.error('Insufficient permissions. Role:', userRole.role);
      return new Response(JSON.stringify({ error: 'Apenas gerentes e vendedores podem criar propostas' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('User authorized with role:', userRole.role);

    const body = await req.json();
    const rawCartText = body?.cartText;
    const rawClientName = body?.clientName;
    
    // Validate and sanitize input
    if (!rawCartText || typeof rawCartText !== 'string') {
      return new Response(JSON.stringify({ error: 'Texto do carrinho é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const cartText = sanitizeString(rawCartText, MAX_CART_TEXT_LENGTH);
    const clientName = sanitizeString(rawClientName, MAX_CLIENT_NAME_LENGTH) || 'Cliente';
    
    if (cartText.length < 10) {
      return new Response(JSON.stringify({ error: 'Texto do carrinho muito curto' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing cart for client:', clientName);
    console.log('Cart text length:', cartText.length);

    const systemPrompt = `Você é um EXPERT em análise de carrinhos de compras de viagens para Orlando, Disney e Universal.

MISSÃO: Extrair ABSOLUTAMENTE TODAS as informações do carrinho para criar uma proposta comercial ENCANTADORA.

REGRAS CRÍTICAS:
1. Leia CADA linha do texto com atenção máxima
2. NÃO INVENTE informações - extraia APENAS o que está no texto
3. Se uma informação não existir, deixe o campo vazio ou não inclua
4. Use EXATAMENTE os nomes, datas e valores que aparecem no carrinho
5. Crie descrições VENDEDORAS e EMOCIONAIS para cada item

ESTRUTURA OBRIGATÓRIA DO JSON (retorne APENAS JSON válido, sem markdown):
{
  "tickets": [
    {
      "name": "NOME EXATO do ingresso como aparece",
      "fullDescription": "Descrição ENCANTADORA de 2-3 frases sobre a experiência mágica que aguarda o cliente. Fale sobre emoções, diversão, memórias.",
      "parks": ["Lista EXATA dos parques incluídos se mencionados"],
      "mainAttractions": ["Top 3-5 atrações imperdíveis se você souber"],
      "benefits": ["Benefícios especiais: Park Hopper, Lightning Lane, etc"],
      "validityDays": "Dias de validade exatos",
      "entryType": "1 parque/dia ou Park Hopper ou outro tipo",
      "date": "Data exata DD/MM/YYYY",
      "time": "Horário se mencionado",
      "guests": "Quantidade EXATA: X Adulto(s), X Criança(s)",
      "specialNotes": "Observações especiais"
    }
  ],
  "hotels": [
    {
      "name": "NOME COMPLETO do hotel",
      "category": "Value, Moderate, Deluxe ou categoria mencionada",
      "fullDescription": "Descrição ENCANTADORA do hotel: o que o torna especial, experiência única, magia que oferece.",
      "roomType": "Tipo de quarto EXATO como aparece",
      "roomDescription": "Descrição do quarto se houver",
      "amenities": ["Piscina", "Transporte Disney", "Restaurante", etc se souber],
      "checkIn": "Data DD/MM/YYYY",
      "checkOut": "Data DD/MM/YYYY",
      "checkInTime": "Horário check-in se mencionado",
      "checkOutTime": "Horário check-out se mencionado",
      "nights": "Número de noites",
      "rooms": "Quantidade de quartos",
      "guests": "Descrição dos hóspedes",
      "mealPlan": "Plano de refeição se incluído",
      "specialRequests": "Pedidos especiais"
    }
  ],
  "cars": [
    {
      "name": "Modelo ou categoria do veículo",
      "category": "Economy, Midsize, SUV, Minivan, etc",
      "fullDescription": "Descrição vendedora: conforto, espaço, ideal para família, etc.",
      "features": ["Ar condicionado", "Automático", "GPS", "Bluetooth"],
      "capacity": "Capacidade de passageiros e malas",
      "pickupLocation": "Local de retirada COMPLETO",
      "pickupDate": "Data DD/MM/YYYY",
      "pickupTime": "Horário",
      "returnLocation": "Local de devolução",
      "returnDate": "Data DD/MM/YYYY",
      "returnTime": "Horário",
      "rentalCompany": "Nome da locadora se mencionado",
      "extras": ["GPS", "Cadeirinha", etc se incluídos]
    }
  ],
  "insurance": [
    {
      "name": "Nome do plano de seguro",
      "fullDescription": "Descrição sobre a tranquilidade e proteção que o seguro oferece para a viagem.",
      "coverageAmount": "Valor da cobertura USD ou R$",
      "coverageDetails": ["Despesas médicas", "Bagagem", "Cancelamento", etc],
      "destination": "Destino coberto",
      "startDate": "Data início DD/MM/YYYY",
      "endDate": "Data fim DD/MM/YYYY",
      "travelers": "Número de segurados",
      "travelerDetails": "Detalhes: idades, etc"
    }
  ],
  "summary": {
    "tripTitle": "Título ENCANTADOR: 'Aventura Mágica Disney', 'Férias dos Sonhos em Orlando', etc",
    "tripDescription": "2-3 frases EMOCIONAIS sobre a viagem perfeita que o cliente vai viver",
    "tripStart": "Data início DD/MM/YYYY",
    "tripEnd": "Data fim DD/MM/YYYY",
    "totalDays": "X dias de magia",
    "totalNights": "X noites",
    "highlights": ["5-8 destaques da viagem: parques, hotel especial, experiências únicas"],
    "travelGroup": "Descrição: Família com X pessoas, Casal, etc"
  }
}

LEMBRE-SE: Crie descrições que VENDEM e ENCANTAM, fazendo o cliente sonhar com a viagem!`;

    // Add timeout for AI API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    let aiResponse;
    try {
      aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { 
              role: 'user', 
              content: `Analise este carrinho de compras e extraia TODAS as informações para criar uma proposta ENCANTADORA:

=== TEXTO DO CARRINHO ===
${cartText}
=== FIM ===

Retorne APENAS o JSON com todos os dados encontrados. Não invente dados que não existem no texto.`
            }
          ],
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes para processar.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error('AI API error');
    }

    const aiData = await aiResponse.json();
    let parsedCart;
    
    try {
      const content = aiData.choices[0].message.content;
      console.log('AI response length:', content.length);
      
      // Clean markdown if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      parsedCart = JSON.parse(cleanContent);
      
      // Validate parsed structure
      if (!validateParsedCart(parsedCart)) {
        throw new Error('Invalid cart structure');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Erro ao processar resposta. Tente novamente.');
    }

    // Validate and clean the response
    const result = {
      tickets: Array.isArray(parsedCart.tickets) ? parsedCart.tickets : [],
      hotels: Array.isArray(parsedCart.hotels) ? parsedCart.hotels : [],
      cars: Array.isArray(parsedCart.cars) ? parsedCart.cars : [],
      insurance: Array.isArray(parsedCart.insurance) ? parsedCart.insurance : [],
      summary: parsedCart.summary || {
        tripTitle: 'Sua Viagem dos Sonhos',
        tripDescription: 'Uma experiência mágica aguarda você!',
        tripStart: '',
        tripEnd: '',
        totalDays: '',
        highlights: []
      },
      clientName: clientName,
      generatedAt: new Date().toISOString(),
    };

    console.log('Parsed successfully:', 
      result.tickets.length, 'tickets,',
      result.hotels.length, 'hotels,',
      result.cars.length, 'cars,',
      result.insurance.length, 'insurance'
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    // Return generic error to avoid leaking internal details
    return new Response(JSON.stringify({ error: 'Erro ao processar carrinho. Tente novamente.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
