import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AccountingEntry {
  data: string;
  movimentacao: string;
  cliente: string;
  valor_recebido: number;
  valor_enviado: number;
  plano_de_contas: string;
  banco: string;
  forma_de_pagamento: string;
  justificativa: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const bankName = formData.get('bankName') as string || 'Banco não informado';
    
    if (!file) {
      return new Response(JSON.stringify({ error: "Nenhum arquivo enviado" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing bank statement: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // Read file as base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    console.log("Sending to Lovable AI for analysis...");

    // Use Lovable AI to analyze the bank statement
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em contabilidade brasileiro. Sua tarefa é analisar extratos bancários em PDF e extrair as transações financeiras.

Para cada transação encontrada, extraia:
- data: formato DD/MM/YYYY
- movimentacao: descrição breve da transação
- cliente: nome do beneficiário/pagador se identificável, caso contrário deixe vazio
- valor_recebido: valor positivo se for crédito/entrada, 0 se for débito
- valor_enviado: valor positivo se for débito/saída, 0 se for crédito
- plano_de_contas: categorize (ex: "Receita de Vendas", "Despesas Operacionais", "Fornecedores", "Salários", "Impostos", "Transferências", etc.)
- forma_de_pagamento: tipo de transação (TED, PIX, Boleto, Débito Automático, Cheque, Cartão, etc.)
- justificativa: observações ou contexto adicional

IMPORTANTE: Retorne APENAS um array JSON válido com os lançamentos, sem texto adicional.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analise este extrato bancário do ${bankName} e extraia todos os lançamentos contábeis. Retorne um array JSON com os campos especificados.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${file.type};base64,${base64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    console.log("AI response received:", content?.substring(0, 500));

    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    // Parse the JSON response
    let entries: AccountingEntry[] = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        entries = JSON.parse(jsonMatch[0]);
      } else {
        // Try parsing the whole content
        entries = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.log("Raw content:", content);
      throw new Error("Não foi possível interpretar os dados do extrato. Tente novamente.");
    }

    // Validate and sanitize entries
    const sanitizedEntries = entries.map((entry, index) => ({
      data: entry.data || new Date().toISOString().split('T')[0],
      movimentacao: (entry.movimentacao || `Transação ${index + 1}`).substring(0, 500),
      cliente: (entry.cliente || '').substring(0, 200),
      valor_recebido: Math.max(0, Number(entry.valor_recebido) || 0),
      valor_enviado: Math.max(0, Number(entry.valor_enviado) || 0),
      plano_de_contas: (entry.plano_de_contas || 'A Classificar').substring(0, 100),
      banco: bankName.substring(0, 100),
      forma_de_pagamento: (entry.forma_de_pagamento || 'Não identificado').substring(0, 50),
      justificativa: (entry.justificativa || '').substring(0, 500),
    }));

    console.log(`Extracted ${sanitizedEntries.length} entries from bank statement`);

    return new Response(JSON.stringify({
      success: true,
      entries: sanitizedEntries,
      message: `${sanitizedEntries.length} lançamentos extraídos do extrato.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in parse-bank-statement function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro ao processar extrato" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
