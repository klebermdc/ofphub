import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Normalize text for fuzzy matching
function norm(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normPedido(s: string | null | undefined): string {
  if (!s) return "";
  return s.toString().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Convert various date formats to ISO YYYY-MM-DD
function toIso(d: string | null | undefined): string {
  if (!d) return "";
  const s = d.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    let [, dd, mm, yy] = m;
    if (yy.length === 2) yy = "20" + yy;
    return `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  // mm/dd/yyyy fallback
  return s;
}

function parseNum(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  let s = v.toString().replace(/[R$\s]/g, "");
  // Brazilian: 1.234,56 -> 1234.56
  if (/,\d{1,2}$/.test(s) && /\./.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/,\d{1,2}$/.test(s)) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Usuário inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    if (!roleRow || roleRow.role !== "manager") {
      return new Response(JSON.stringify({ error: "Apenas gerentes podem executar auditoria" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Input ---
    const body = await req.json();
    const pdfBase64: string = body?.pdfBase64;
    const fileName: string = body?.fileName || "relatorio.pdf";
    const periodStart: string | null = body?.periodStart || null; // YYYY-MM-DD
    const periodEnd: string | null = body?.periodEnd || null;

    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return new Response(JSON.stringify({ error: "PDF é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip data URL prefix if present
    const cleanB64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");

    // --- 1) Extract orders from PDF using Gemini 2.5 Pro (best for accuracy) ---
    const extractionPrompt = `Você é um auditor financeiro EXPERT. Sua missão é extrair, com PRECISÃO ABSOLUTA, TODOS os pedidos/transações listados neste relatório do fornecedor "Just Travel".

REGRAS CRÍTICAS (envolve dinheiro real - ZERO erros tolerados):
1. Extraia CADA linha de pedido. NÃO PULE NENHUMA.
2. NÃO INVENTE dados. Se um campo não existir, deixe null.
3. Use os valores EXATOS como aparecem no PDF (não arredonde).
4. Datas: converta para formato DD/MM/YYYY.
5. Valores monetários: extraia como número (sem R$, com ponto decimal).
6. Identifique também: total geral do relatório, período coberto.

Retorne APENAS JSON válido (sem markdown, sem comentários) chamando a função extract_just_travel_report.`;

    const extractionTool = {
      type: "function",
      function: {
        name: "extract_just_travel_report",
        description: "Extrai todos os pedidos do relatório Just Travel",
        parameters: {
          type: "object",
          properties: {
            period_start: { type: "string", description: "Data início do período no relatório (DD/MM/YYYY) ou null" },
            period_end: { type: "string", description: "Data fim do período (DD/MM/YYYY) ou null" },
            total_geral: { type: "number", description: "Soma total do relatório" },
            total_comissao_geral: { type: "number", description: "Total de comissão do relatório, se houver" },
            orders: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pedido: { type: "string", description: "Número/código do pedido (confirmação, voucher, ID)" },
                  cliente: { type: "string", description: "Nome do cliente/passageiro" },
                  produto: { type: "string", description: "Produto/serviço (ingresso, hotel, etc)" },
                  data: { type: "string", description: "Data do pedido (DD/MM/YYYY)" },
                  valor: { type: "number", description: "Valor da venda (numérico)" },
                  comissao: { type: "number", description: "Valor da comissão paga, se aparecer" },
                  comissao_percentual: { type: "number", description: "Percentual de comissão, se aparecer" },
                  moeda: { type: "string", description: "BRL ou USD" },
                },
                required: ["pedido", "valor"],
              },
            },
          },
          required: ["orders"],
        },
      },
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: extractionPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia TODOS os pedidos deste relatório Just Travel com precisão financeira absoluta." },
              { type: "image_url", image_url: { url: `data:application/pdf;base64,${cleanB64}` } },
            ],
          },
        ],
        tools: [extractionTool],
        tool_choice: { type: "function", function: { name: "extract_just_travel_report" } },
        max_tokens: 16000,
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições. Aguarde alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha ao processar PDF com IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call:", JSON.stringify(aiData).slice(0, 500));
      return new Response(JSON.stringify({ error: "IA não conseguiu extrair dados do PDF" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extracted = JSON.parse(toolCall.function.arguments);
    const reportOrders: any[] = Array.isArray(extracted.orders) ? extracted.orders : [];

    // --- 2) Fetch DB orders for Just Travel (paginated) ---
    const dbOrders: any[] = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      let q = admin
        .from("orders")
        .select("id, pedido, cliente, produto, data, venda, comissao, comissao_total, fornecedor, vendedor")
        .ilike("fornecedor", "%just travel%")
        .range(from, from + PAGE - 1);
      const { data, error } = await q;
      if (error) {
        console.error("DB fetch error:", error);
        break;
      }
      if (!data || data.length === 0) break;
      dbOrders.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    // Filter DB orders by period if provided
    const startIso = periodStart ? toIso(periodStart) : (extracted.period_start ? toIso(extracted.period_start) : null);
    const endIso = periodEnd ? toIso(periodEnd) : (extracted.period_end ? toIso(extracted.period_end) : null);

    const dbInPeriod = dbOrders.filter((o) => {
      if (!startIso && !endIso) return true;
      const iso = toIso(o.data);
      if (startIso && iso < startIso) return false;
      if (endIso && iso > endIso) return false;
      return true;
    });

    // --- 3) Build matching index ---
    const dbByPedido = new Map<string, any>();
    const dbByClienteValor = new Map<string, any>();
    for (const o of dbInPeriod) {
      const k1 = normPedido(o.pedido);
      if (k1) dbByPedido.set(k1, o);
      const k2 = `${norm(o.cliente)}|${parseNum(o.venda).toFixed(2)}`;
      dbByClienteValor.set(k2, o);
    }

    const matchedDbIds = new Set<string>();
    const divergencias: any[] = [];

    // Tolerance for monetary comparison (1 cent)
    const TOL = 0.01;

    for (const r of reportOrders) {
      const rPedido = normPedido(r.pedido);
      const rCliente = norm(r.cliente);
      const rValor = parseNum(r.valor);
      const rComissao = parseNum(r.comissao);
      const rData = toIso(r.data);

      let dbMatch = rPedido ? dbByPedido.get(rPedido) : null;
      if (!dbMatch) {
        const k = `${rCliente}|${rValor.toFixed(2)}`;
        dbMatch = dbByClienteValor.get(k);
      }

      if (!dbMatch) {
        divergencias.push({
          tipo: "FALTANDO_NO_BANCO",
          severidade: "critica",
          descricao: `Pedido "${r.pedido}" do cliente "${r.cliente || '?'}" aparece no relatório Just Travel mas NÃO está no nosso banco de dados.`,
          relatorio: r,
          banco: null,
        });
        continue;
      }

      matchedDbIds.add(dbMatch.id);
      const dbValor = parseNum(dbMatch.venda);
      const dbComissao = parseNum(dbMatch.comissao);
      const dbCliente = norm(dbMatch.cliente);
      const dbProduto = norm(dbMatch.produto);
      const rProduto = norm(r.produto);
      const dbData = toIso(dbMatch.data);

      const issues: string[] = [];

      if (Math.abs(dbValor - rValor) > TOL) {
        issues.push(`Valor diverge: relatório R$ ${rValor.toFixed(2)} vs banco R$ ${dbValor.toFixed(2)} (diferença R$ ${(rValor - dbValor).toFixed(2)})`);
      }
      if (rComissao > 0 && dbComissao > 0 && Math.abs(dbComissao - rComissao) > TOL) {
        issues.push(`Comissão diverge: relatório R$ ${rComissao.toFixed(2)} vs banco R$ ${dbComissao.toFixed(2)}`);
      }
      if (rCliente && dbCliente && rCliente !== dbCliente && !rCliente.includes(dbCliente) && !dbCliente.includes(rCliente)) {
        issues.push(`Cliente diverge: relatório "${r.cliente}" vs banco "${dbMatch.cliente}"`);
      }
      if (rProduto && dbProduto && rProduto !== dbProduto && !rProduto.includes(dbProduto) && !dbProduto.includes(rProduto)) {
        issues.push(`Produto diverge: relatório "${r.produto}" vs banco "${dbMatch.produto}"`);
      }
      if (rData && dbData && rData !== dbData) {
        issues.push(`Data diverge: relatório ${r.data} vs banco ${dbData}`);
      }

      if (issues.length > 0) {
        const valorDif = Math.abs(dbValor - rValor) > TOL;
        const comDif = rComissao > 0 && dbComissao > 0 && Math.abs(dbComissao - rComissao) > TOL;
        divergencias.push({
          tipo: valorDif ? "VALOR_DIVERGENTE" : (comDif ? "COMISSAO_DIVERGENTE" : "DADOS_DIVERGENTES"),
          severidade: (valorDif || comDif) ? "critica" : "atencao",
          descricao: `Pedido ${dbMatch.pedido || r.pedido}: ${issues.join(" | ")}`,
          issues,
          relatorio: r,
          banco: dbMatch,
        });
      }
    }

    // DB orders not present in report
    for (const o of dbInPeriod) {
      if (!matchedDbIds.has(o.id)) {
        divergencias.push({
          tipo: "FALTANDO_NO_RELATORIO",
          severidade: "critica",
          descricao: `Pedido ${o.pedido || '(sem nº)'} do cliente "${o.cliente || '?'}" (R$ ${parseNum(o.venda).toFixed(2)}) está no nosso banco mas NÃO aparece no relatório da Just Travel.`,
          relatorio: null,
          banco: o,
        });
      }
    }

    // --- 4) Summary ---
    const totalRelatorio = reportOrders.reduce((s, r) => s + parseNum(r.valor), 0);
    const totalBanco = dbInPeriod.reduce((s, o) => s + parseNum(o.venda), 0);
    const reportComissaoTotal = reportOrders.reduce((s, r) => s + parseNum(r.comissao), 0);
    const bancoComissaoTotal = dbInPeriod.reduce((s, o) => s + parseNum(o.comissao), 0);

    const summary = {
      arquivo: fileName,
      periodo: { inicio: startIso, fim: endIso },
      pedidos_no_relatorio: reportOrders.length,
      pedidos_no_banco: dbInPeriod.length,
      pedidos_conferidos: matchedDbIds.size,
      faltando_no_banco: divergencias.filter((d) => d.tipo === "FALTANDO_NO_BANCO").length,
      faltando_no_relatorio: divergencias.filter((d) => d.tipo === "FALTANDO_NO_RELATORIO").length,
      valor_divergente: divergencias.filter((d) => d.tipo === "VALOR_DIVERGENTE").length,
      comissao_divergente: divergencias.filter((d) => d.tipo === "COMISSAO_DIVERGENTE").length,
      total_relatorio: totalRelatorio,
      total_banco: totalBanco,
      diferenca_total: totalRelatorio - totalBanco,
      comissao_total_relatorio: reportComissaoTotal,
      comissao_total_banco: bancoComissaoTotal,
      total_divergencias: divergencias.length,
    };

    return new Response(
      JSON.stringify({ success: true, summary, divergencias, extracted_meta: { period_start: extracted.period_start, period_end: extracted.period_end, total_geral: extracted.total_geral } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("audit-just-travel error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
