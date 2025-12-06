import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { cartText, clientName } = await req.json();
    
    if (!cartText) {
      return new Response(JSON.stringify({ error: 'Cart text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing cart for client:', clientName);
    console.log('Cart text preview:', cartText.substring(0, 200));

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

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
    });

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
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let parsedCart;
    
    try {
      const content = aiData.choices[0].message.content;
      console.log('AI response preview:', content.substring(0, 500));
      
      // Clean markdown if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      parsedCart = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', aiData.choices[0].message.content);
      throw new Error('Erro ao processar resposta da IA. Tente novamente.');
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
      clientName: clientName || 'Cliente',
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
    const errorMessage = error instanceof Error ? error.message : 'Erro ao processar carrinho';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
