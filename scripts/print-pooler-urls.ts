/**
 * Mostra como ficariam DATABASE_URL / DIRECT_URL após normalização (sem gravar).
 *
 * Uso:
 *   set SUPABASE_POOLER_HOST=aws-0-us-east-1.pooler.supabase.com
 *   npx tsx scripts/print-pooler-urls.ts
 *
 * Copie o host exato do botão Connect → Session pooler no Supabase.
 */
import { config as loadDotenv } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";
import {
  normalizeSupabaseDatabaseUrl,
  isSupabaseDirectDbHost,
} from "../src/config/load-env";

const envPath = [resolve(process.cwd(), ".env"), resolve(__dirname, "../.env")].find((p) =>
  existsSync(p),
);
if (envPath) loadDotenv({ path: envPath });
else loadDotenv();

function mask(url: string) {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return url;
  }
}

const raw = process.env.DATABASE_URL?.trim() ?? "";
const poolerHost = process.env.SUPABASE_POOLER_HOST?.trim() ?? "";

console.log("envFile=", envPath ?? "(não encontrado)");
console.log("SUPABASE_POOLER_HOST=", poolerHost || "(vazio — defina o host do Connect)");
console.log("DATABASE_URL atual=", mask(raw));

if (!raw) {
  console.error("DATABASE_URL vazio.");
  process.exit(1);
}

const host = new URL(raw).hostname;
if (isSupabaseDirectDbHost(host) && !poolerHost) {
  console.error(
    "\nURI direta (db.*) detectada. Na VPS isso falha (IPv6).\n" +
      "1. Abra o Supabase → Connect → Session pooler\n" +
      "2. Copie o host (ex.: aws-0-us-east-1.pooler.supabase.com)\n" +
      "3. No .env: SUPABASE_POOLER_HOST=<esse-host>\n" +
      "   ou substitua DATABASE_URL/DIRECT_URL pela URI completa do Session pooler.\n",
  );
  process.exit(2);
}

const runtime = normalizeSupabaseDatabaseUrl(raw, { role: "runtime" });
const direct = normalizeSupabaseDatabaseUrl(process.env.DIRECT_URL?.trim() || raw, {
  role: "direct",
});

console.log("\n→ runtime (app) =", mask(runtime));
console.log("→ direct (migrate) =", mask(direct));
console.log("\nCole estas URLs (ou só SUPABASE_POOLER_HOST) no .env da VPS e reinicie.");
