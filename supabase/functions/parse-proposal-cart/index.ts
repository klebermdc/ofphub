import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Park and hotel image database with real images
const PARK_IMAGES: Record<string, string> = {
  // Disney Parks
  'magic kingdom': 'https://images.unsplash.com/photo-1597466599360-3b9775841aec?w=800&q=80',
  'epcot': 'https://images.unsplash.com/photo-1593326386945-5a9d3a18f2a1?w=800&q=80',
  'hollywood studios': 'https://images.unsplash.com/photo-1609952048180-7b35ea6b083b?w=800&q=80',
  'animal kingdom': 'https://images.unsplash.com/photo-1617581629397-a72507c3de9e?w=800&q=80',
  'disney': 'https://images.unsplash.com/photo-1597466599360-3b9775841aec?w=800&q=80',
  
  // Universal Parks
  'universal': 'https://images.unsplash.com/photo-1608561466929-aceb2f8053c0?w=800&q=80',
  'epic universe': 'https://images.unsplash.com/photo-1608561466929-aceb2f8053c0?w=800&q=80',
  'islands of adventure': 'https://images.unsplash.com/photo-1608561466929-aceb2f8053c0?w=800&q=80',
  
  // SeaWorld Parks
  'seaworld': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
  'discovery cove': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
  'aquatica': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
  'busch gardens': 'https://images.unsplash.com/photo-1594818379496-da1e345b0ded?w=800&q=80',
  
  // Hotels
  'animal kingdom lodge': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  'grand floridian': 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
  'contemporary': 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
  'polynesian': 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
  'wilderness lodge': 'https://images.unsplash.com/photo-1587213811864-46e59f6873b1?w=800&q=80',
  'beach club': 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',
  'yacht club': 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',
  'boardwalk': 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
  'coronado springs': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  'riviera': 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
  'art of animation': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
  'pop century': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
  'all star': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
  
  // Universal Hotels
  'portofino bay': 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
  'hard rock hotel': 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
  'royal pacific': 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',
  'sapphire falls': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  'cabana bay': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
  'aventura': 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
  
  // Car rental
  'chevrolet': 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80',
  'carro': 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80',
  
  // Travel insurance
  'seguro': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
  'travel care': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
  
  // Default Orlando
  'default': 'https://images.unsplash.com/photo-1575089776834-8be34c2bfc48?w=800&q=80',
};

function findBestImage(itemName: string): string {
  const lowerName = itemName.toLowerCase();
  
  for (const [keyword, imageUrl] of Object.entries(PARK_IMAGES)) {
    if (lowerName.includes(keyword)) {
      return imageUrl;
    }
  }
  
  return PARK_IMAGES['default'];
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

    // Use AI to parse the cart text
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
            content: `Você é um assistente especializado em analisar carrinhos de compras de viagens para Orlando.
            
Analise o texto do carrinho e extraia as informações em formato JSON estruturado.

IMPORTANTE: Retorne APENAS o JSON válido, sem markdown, sem \`\`\`, sem texto adicional.

O JSON deve ter esta estrutura exata:
{
  "tickets": [
    {
      "name": "Nome do ingresso/parque",
      "description": "Descrição completa",
      "date": "Data no formato DD/MM/YYYY",
      "duration": "Duração (ex: 1 dia, 4 dias)",
      "guests": "Quantidade e tipo de pessoas (ex: 4 Adultos, 2 Crianças)",
      "park": "Nome do parque principal"
    }
  ],
  "hotels": [
    {
      "name": "Nome do hotel",
      "roomType": "Tipo de quarto",
      "checkIn": "Data check-in DD/MM/YYYY",
      "checkOut": "Data check-out DD/MM/YYYY",
      "nights": "Número de noites",
      "rooms": "Quantidade de quartos",
      "guests": "Quantidade de hóspedes"
    }
  ],
  "cars": [
    {
      "name": "Modelo do carro",
      "pickupLocation": "Local de retirada",
      "pickupDate": "Data/hora retirada",
      "returnLocation": "Local de devolução",
      "returnDate": "Data/hora devolução"
    }
  ],
  "insurance": [
    {
      "name": "Nome do plano de seguro",
      "coverage": "Valor da cobertura",
      "destination": "Destino",
      "dates": "Período de cobertura",
      "travelers": "Número de segurados"
    }
  ],
  "summary": {
    "tripStart": "Data início da viagem",
    "tripEnd": "Data fim da viagem",
    "totalDays": "Total de dias",
    "highlights": ["Destaque 1", "Destaque 2"]
  }
}`
          },
          {
            role: 'user',
            content: `Analise este carrinho de compras e retorne o JSON estruturado:\n\n${cartText}`
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
      console.log('AI response content:', content.substring(0, 500));
      
      // Clean the response - remove markdown code blocks if present
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

    // Add images to each item
    const addImagesToItems = (items: any[], type: string) => {
      return items?.map(item => ({
        ...item,
        image: findBestImage(item.name || item.park || type)
      })) || [];
    };

    const enrichedCart = {
      ...parsedCart,
      tickets: addImagesToItems(parsedCart.tickets, 'disney'),
      hotels: addImagesToItems(parsedCart.hotels, 'hotel'),
      cars: addImagesToItems(parsedCart.cars, 'carro'),
      insurance: addImagesToItems(parsedCart.insurance, 'seguro'),
      clientName: clientName || 'Cliente',
      generatedAt: new Date().toISOString(),
    };

    console.log('Successfully parsed cart with', 
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
