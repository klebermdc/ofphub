const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const UTALK_TOKEN = Deno.env.get('UTALK_TOKEN');
    const UTALK_ORG = Deno.env.get('UTALK_ORG_ID');

    if (!UTALK_TOKEN || !UTALK_ORG) {
      return new Response(JSON.stringify({ error: 'Missing uTalk credentials' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(
      `https://app-utalk.umbler.com/api/v1/chats/?organizationId=${UTALK_ORG}&ChatState=0&Take=150`,
      { headers: { Authorization: `Bearer ${UTALK_TOKEN}` } }
    );

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `uTalk API error: ${res.status}` }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const chats = data.items || [];

    const byAgent: Record<string, number> = {};
    let semVendedor = 0;

    for (const c of chats) {
      const agent = c.agent?.name;
      if (agent) byAgent[agent] = (byAgent[agent] || 0) + 1;
      else semVendedor++;
    }

    return new Response(JSON.stringify({
      total: chats.length,
      semVendedor,
      byAgent,
      updatedAt: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
