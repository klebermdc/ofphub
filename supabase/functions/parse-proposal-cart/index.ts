import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Extensive park and attraction image database
const IMAGE_DATABASE: Record<string, string[]> = {
  // Disney Magic Kingdom
  'magic kingdom': [
    'https://images.unsplash.com/photo-1597466599360-3b9775841aec?w=800&q=80',
    'https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=800&q=80',
    'https://images.unsplash.com/photo-1547575545-3ae3c5e45a21?w=800&q=80',
  ],
  // Disney EPCOT
  'epcot': [
    'https://images.unsplash.com/photo-1593326386945-5a9d3a18f2a1?w=800&q=80',
    'https://images.unsplash.com/photo-1610641818989-c2051b5e2cfd?w=800&q=80',
  ],
  // Disney Hollywood Studios
  'hollywood studios': [
    'https://images.unsplash.com/photo-1609952048180-7b35ea6b083b?w=800&q=80',
    'https://images.unsplash.com/photo-1596967719771-c5cd0b9e1ebb?w=800&q=80',
  ],
  // Disney Animal Kingdom
  'animal kingdom': [
    'https://images.unsplash.com/photo-1617581629397-a72507c3de9e?w=800&q=80',
    'https://images.unsplash.com/photo-1594818379496-da1e345b0ded?w=800&q=80',
  ],
  // Disney General
  'disney': [
    'https://images.unsplash.com/photo-1597466599360-3b9775841aec?w=800&q=80',
    'https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=800&q=80',
  ],
  
  // Universal Parks
  'universal': [
    'https://images.unsplash.com/photo-1608561466929-aceb2f8053c0?w=800&q=80',
    'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&q=80',
  ],
  'epic universe': [
    'https://images.unsplash.com/photo-1608561466929-aceb2f8053c0?w=800&q=80',
  ],
  'islands of adventure': [
    'https://images.unsplash.com/photo-1608561466929-aceb2f8053c0?w=800&q=80',
  ],
  'harry potter': [
    'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=800&q=80',
    'https://images.unsplash.com/photo-1618944847828-82e943c3bdb7?w=800&q=80',
  ],
  
  // SeaWorld Parks
  'seaworld': [
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
    'https://images.unsplash.com/photo-1568702846914-96b305d2uj38?w=800&q=80',
  ],
  'discovery cove': [
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
  ],
  'aquatica': [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    'https://images.unsplash.com/photo-1564429238980-c7e8ce7c3ad4?w=800&q=80',
  ],
  'busch gardens': [
    'https://images.unsplash.com/photo-1594818379496-da1e345b0ded?w=800&q=80',
  ],
  
  // Disney Hotels
  'animal kingdom lodge': [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
  ],
  'grand floridian': [
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  ],
  'contemporary': [
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
  ],
  'polynesian': [
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
  ],
  'wilderness lodge': [
    'https://images.unsplash.com/photo-1587213811864-46e59f6873b1?w=800&q=80',
  ],
  'beach club': [
    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',
  ],
  'yacht club': [
    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',
  ],
  'boardwalk': [
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
  ],
  'coronado springs': [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  ],
  'riviera': [
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
  ],
  'art of animation': [
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
  ],
  'pop century': [
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
  ],
  'all star': [
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
  ],
  
  // Universal Hotels
  'portofino bay': [
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
  ],
  'hard rock hotel': [
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
  ],
  'royal pacific': [
    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',
  ],
  'sapphire falls': [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  ],
  'cabana bay': [
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
  ],
  'aventura': [
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
  ],
  
  // Cars
  'midsize': [
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80',
  ],
  'suv': [
    'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80',
  ],
  'minivan': [
    'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&q=80',
  ],
  'carro': [
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80',
  ],
  'chevrolet': [
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80',
  ],
  
  // Insurance
  'seguro': [
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80',
  ],
  'travel care': [
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
  ],
  
  // Orlando general
  'orlando': [
    'https://images.unsplash.com/photo-1575089776834-8be34c2bfc48?w=800&q=80',
    'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800&q=80',
  ],
  'florida': [
    'https://images.unsplash.com/photo-1575089776834-8be34c2bfc48?w=800&q=80',
  ],
};

function findImages(itemName: string, type: string): string[] {
  const lowerName = itemName.toLowerCase();
  
  for (const [keyword, images] of Object.entries(IMAGE_DATABASE)) {
    if (lowerName.includes(keyword)) {
      return images;
    }
  }
  
  // Default images by type
  const defaults: Record<string, string[]> = {
    'ticket': IMAGE_DATABASE['disney'],
    'hotel': [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
    ],
    'car': IMAGE_DATABASE['carro'],
    'insurance': IMAGE_DATABASE['seguro'],
  };
  
  return defaults[type] || IMAGE_DATABASE['orlando'];
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

    console.log('Processing cart text for client:', clientName);
    console.log('Cart text length:', cartText.length);

    // Use AI to parse the cart text with EXTREMELY detailed extraction
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente ESPECIALISTA em analisar carrinhos de compras de viagens para Orlando/Disney/Universal.

SEU OBJETIVO: Extrair ABSOLUTAMENTE TODAS as informações do carrinho de forma EXTREMAMENTE DETALHADA para criar uma proposta de viagem encantadora.

INSTRUÇÕES CRÍTICAS:
1. Leia TODO o texto do carrinho com atenção máxima
2. Extraia CADA detalhe: nomes completos, datas, horários, quantidades, tipos, descrições
3. Para INGRESSOS: nome completo do parque, quais parques estão incluídos, tipo de ingresso (Park Hopper, etc), dias de validade, horários de entrada, benefícios incluídos
4. Para HOTÉIS: nome completo, tipo de quarto com descrição, vista, cama, capacidade, comodidades, datas exatas
5. Para CARROS: modelo completo, categoria, caracteristicas (ar, automático, etc), locais de retirada/devolução
6. Para SEGUROS: nome do plano, valor da cobertura, o que cobre, período

CRIE descrições ENCANTADORAS que vendam a experiência!

RETORNE APENAS JSON VÁLIDO (sem markdown, sem \`\`\`):

{
  "tickets": [
    {
      "name": "Nome COMPLETO do ingresso exatamente como aparece",
      "fullDescription": "Descrição COMPLETA e ENCANTADORA do que este ingresso oferece, incluindo todos os parques, atrações principais, benefícios especiais. Mínimo 2-3 frases vendedoras.",
      "parks": ["Lista de TODOS os parques incluídos"],
      "mainAttractions": ["Atrações imperdíveis de cada parque - liste pelo menos 3-5"],
      "benefits": ["Todos os benefícios: Lightning Lane, Park Hopper, etc"],
      "validityDays": "Quantidade de dias de validade",
      "entryType": "Tipo de entrada (1 parque/dia, Park Hopper, etc)",
      "date": "Data exata no formato DD/MM/YYYY",
      "time": "Horário de entrada se houver",
      "guests": "Quantidade e tipo: X Adultos, X Crianças (idade)",
      "specialNotes": "Qualquer observação especial, restrições, dicas"
    }
  ],
  "hotels": [
    {
      "name": "Nome COMPLETO do hotel",
      "category": "Categoria (Value, Moderate, Deluxe, etc)",
      "fullDescription": "Descrição ENCANTADORA do hotel: localização, tema, experiência única, por que é especial. Mínimo 2-3 frases.",
      "roomType": "Tipo de quarto COMPLETO como aparece",
      "roomDescription": "Descrição do quarto: vista, cama, tamanho, decoração",
      "amenities": ["Lista de comodidades: piscina, transporte, restaurantes, etc"],
      "checkIn": "Data check-in DD/MM/YYYY",
      "checkOut": "Data check-out DD/MM/YYYY",
      "checkInTime": "Horário check-in",
      "checkOutTime": "Horário check-out",
      "nights": "Número de noites",
      "rooms": "Quantidade de quartos",
      "guests": "Descrição dos hóspedes",
      "mealPlan": "Plano de refeição se incluído",
      "specialRequests": "Pedidos especiais se houver"
    }
  ],
  "cars": [
    {
      "name": "Modelo/Categoria do carro",
      "category": "Categoria (Economy, Midsize, SUV, Minivan)",
      "fullDescription": "Descrição do veículo: capacidade, bagagem, conforto, ideal para...",
      "features": ["Ar condicionado", "Automático", "GPS", "etc"],
      "capacity": "Capacidade de passageiros e malas",
      "pickupLocation": "Local de retirada COMPLETO",
      "pickupDate": "Data retirada DD/MM/YYYY",
      "pickupTime": "Horário retirada",
      "returnLocation": "Local de devolução",
      "returnDate": "Data devolução DD/MM/YYYY",
      "returnTime": "Horário devolução",
      "rentalCompany": "Locadora se mencionada",
      "extras": ["Extras incluídos: GPS, cadeirinha, etc"]
    }
  ],
  "insurance": [
    {
      "name": "Nome COMPLETO do plano de seguro",
      "fullDescription": "Descrição do que o seguro cobre e por que é importante. Tranquilidade para a viagem.",
      "coverageAmount": "Valor total da cobertura em USD ou R$",
      "coverageDetails": ["Lista de coberturas: médica, bagagem, cancelamento, etc"],
      "destination": "Destino coberto",
      "startDate": "Data início DD/MM/YYYY",
      "endDate": "Data fim DD/MM/YYYY",
      "travelers": "Número de segurados",
      "travelerDetails": "Detalhes dos segurados (idades, etc)",
      "emergencyContact": "Contato de emergência se houver"
    }
  ],
  "summary": {
    "tripTitle": "Um título ENCANTADOR para a viagem (ex: 'Aventura Mágica em Orlando')",
    "tripDescription": "Uma descrição EMPOLGANTE de 2-3 frases sobre a viagem dos sonhos",
    "tripStart": "Data início DD/MM/YYYY",
    "tripEnd": "Data fim DD/MM/YYYY",
    "totalDays": "X dias de magia",
    "totalNights": "X noites",
    "totalParks": "Quantidade de parques incluídos",
    "totalExperiences": "Total de experiências únicas",
    "highlights": ["Lista de 5-8 destaques imperdíveis da viagem"],
    "travelGroup": "Descrição do grupo: família, casal, amigos, quantidade de pessoas"
  }
}`
          },
          {
            role: 'user',
            content: `Analise DETALHADAMENTE este carrinho de compras e extraia TODAS as informações possíveis para criar uma proposta de viagem ENCANTADORA:

===== TEXTO DO CARRINHO =====
${cartText}
===== FIM DO TEXTO =====

Retorne o JSON completo com TODOS os detalhes encontrados.`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let parsedCart;
    
    try {
      const content = aiData.choices[0].message.content;
      console.log('AI response content preview:', content.substring(0, 1000));
      
      // Clean the response
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      parsedCart = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse cart information');
    }

    // Enrich with multiple images for each item
    const enrichItems = (items: any[], type: string) => {
      return items?.map(item => {
        const images = findImages(item.name || item.parks?.[0] || type, type);
        return {
          ...item,
          images: images,
          mainImage: images[0],
        };
      }) || [];
    };

    const enrichedCart = {
      ...parsedCart,
      tickets: enrichItems(parsedCart.tickets, 'ticket'),
      hotels: enrichItems(parsedCart.hotels, 'hotel'),
      cars: enrichItems(parsedCart.cars, 'car'),
      insurance: enrichItems(parsedCart.insurance, 'insurance'),
      clientName: clientName || 'Cliente',
      generatedAt: new Date().toISOString(),
    };

    console.log('Successfully parsed DETAILED cart with', 
      enrichedCart.tickets?.length || 0, 'tickets,',
      enrichedCart.hotels?.length || 0, 'hotels,',
      enrichedCart.cars?.length || 0, 'cars,',
      enrichedCart.insurance?.length || 0, 'insurance items'
    );

    return new Response(JSON.stringify(enrichedCart), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error processing cart:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process cart';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
