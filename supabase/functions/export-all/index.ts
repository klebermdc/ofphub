// TEMPORARY — one-off read-only export used to migrate off Lovable Cloud.
// Delete this function once the migration is done.
import postgres from "npm:postgres@3.4.4";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-export-token",
};

// SHA-256 of the export token. The token itself only lives on the operator's machine.
const EXPORT_TOKEN_SHA256 = "f4244334f09177ca99c4f5dc88a269b01776d6e00fe4cb010508a2e8883ceefa";
const ALLOWED_SCHEMAS = ["public", "auth", "storage"];
const MAX_PAGE_SIZE = 5000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function isAuthorized(req: Request): Promise<boolean> {
  const token = req.headers.get("x-export-token");
  if (!token) return false;
  return timingSafeEqual(await sha256Hex(token), EXPORT_TOKEN_SHA256);
}

type Sql = ReturnType<typeof postgres>;

async function listTables(sql: Sql) {
  return await sql`
    select n.nspname as schema, c.relname as name, c.reltuples::bigint as estimated_rows
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p') and n.nspname = any(${ALLOWED_SCHEMAS})
    order by 1, 2`;
}

async function inventory(sql: Sql) {
  const tables = await listTables(sql);
  const withCounts = [];
  for (const t of tables) {
    const [{ count }] = await sql`select count(*)::bigint as count from ${sql(t.schema)}.${sql(t.name)}`;
    withCounts.push({ schema: t.schema, name: t.name, rows: Number(count) });
  }
  const extensions = await sql`select extname, extversion from pg_extension order by 1`;
  const buckets = await sql`select id, name, public, file_size_limit, allowed_mime_types from storage.buckets`;
  const hasCron = extensions.some((e) => e.extname === "pg_cron");
  const cronJobs = hasCron ? await sql`select jobname, schedule, command, active from cron.job` : [];
  return { tables: withCounts, extensions, buckets, cronJobs };
}

async function schemaSnapshot(sql: Sql) {
  const columns = await sql`
    select table_name, column_name, data_type, udt_name, is_nullable, column_default
    from information_schema.columns where table_schema = 'public'
    order by table_name, ordinal_position`;
  const policies = await sql`select schemaname, tablename, policyname, cmd, roles, qual, with_check from pg_policies
    where schemaname in ('public', 'storage') order by 1, 2, 3`;
  const functions = await sql`
    select p.proname as name, pg_get_functiondef(p.oid) as definition
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' order by 1`;
  const triggers = await sql`
    select c.relname as table_name, t.tgname as name, pg_get_triggerdef(t.oid) as definition
    from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal and n.nspname in ('public', 'auth') order by 1, 2`;
  const enums = await sql`
    select t.typname as name, array_agg(e.enumlabel order by e.enumsortorder) as labels
    from pg_type t join pg_enum e on e.enumtypid = t.oid join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' group by 1 order by 1`;
  return { columns, policies, functions, triggers, enums };
}

async function tableRows(sql: Sql, params: URLSearchParams) {
  const schema = params.get("schema") ?? "";
  const table = params.get("table") ?? "";
  const offset = Math.max(0, Number(params.get("offset") ?? 0) || 0);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(params.get("limit") ?? MAX_PAGE_SIZE) || MAX_PAGE_SIZE));

  const known = await listTables(sql);
  if (!known.some((t) => t.schema === schema && t.name === table)) {
    return json({ error: `Unknown table ${schema}.${table}` }, 400);
  }
  const rows = await sql`
    select row_to_json(t) as row from ${sql(schema)}.${sql(table)} t
    order by t.ctid offset ${offset} limit ${limit}`;
  return json({ schema, table, offset, rows: rows.map((r) => r.row) });
}

async function storageList(sql: Sql) {
  const objects = await sql`
    select bucket_id, name, metadata, created_at, updated_at, owner_id
    from storage.objects order by bucket_id, name`;
  return json({ objects });
}

async function storageGet(params: URLSearchParams) {
  const bucket = params.get("bucket") ?? "";
  const path = params.get("path") ?? "";
  if (!bucket || !path) return json({ error: "bucket and path are required" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await admin.storage.from(bucket).download(path);
  if (error || !data) return json({ error: error?.message ?? "download failed" }, 404);
  return new Response(data, {
    headers: { ...corsHeaders, "Content-Type": data.type || "application/octet-stream" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!(await isAuthorized(req))) return json({ error: "Unauthorized" }, 401);

  const params = new URL(req.url).searchParams;
  const action = params.get("action") ?? "ping";

  if (action === "ping") {
    return json({
      ok: true,
      env: {
        SUPABASE_DB_URL: Boolean(Deno.env.get("SUPABASE_DB_URL")),
        SUPABASE_URL: Boolean(Deno.env.get("SUPABASE_URL")),
        SUPABASE_SERVICE_ROLE_KEY: Boolean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")),
      },
    });
  }
  if (action === "storage-get") return await storageGet(params);

  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) return json({ error: "SUPABASE_DB_URL is not available" }, 500);

  const sql = postgres(dbUrl, { prepare: false, max: 1 });
  try {
    if (action === "inventory") return json(await inventory(sql));
    if (action === "schema") return json(await schemaSnapshot(sql));
    if (action === "rows") return await tableRows(sql, params);
    if (action === "storage-list") return await storageList(sql);
    return json({ error: `Unknown action ${action}` }, 400);
  } catch (err) {
    console.error("export-all failed", { action, error: String(err) });
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  } finally {
    await sql.end({ timeout: 5 });
  }
});
