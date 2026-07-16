import { config as loadDotenv } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

/**
 * Carrega `.env` a partir do diretório do projeto, não só do `process.cwd()`.
 * Em VPS (systemd/pm2) o cwd costuma ser `/` ou outro path e o dotenv falha em silêncio.
 */
export function loadProjectEnv(): string | null {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(__dirname, "../../.env"),
    resolve(__dirname, "../../../.env"),
  ];

  for (const file of candidates) {
    if (!existsSync(file)) continue;
    loadDotenv({ path: file, override: false });
    return file;
  }

  loadDotenv();
  return null;
}

function isSupabaseHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h.endsWith(".supabase.co") ||
    h.endsWith(".pooler.supabase.com") ||
    h.includes("supabase.com")
  );
}

/** `db.<projectRef>.supabase.co` — conexão direta (IPv6-only na maioria dos projetos). */
export function extractDirectDbProjectRef(hostname: string): string | null {
  const m = hostname.toLowerCase().match(/^db\.([a-z0-9-]+)\.supabase\.co$/);
  return m?.[1] ?? null;
}

export function isSupabaseDirectDbHost(hostname: string): boolean {
  return Boolean(extractDirectDbProjectRef(hostname));
}

export function isSupabasePoolerHost(hostname: string): boolean {
  return hostname.toLowerCase().includes("pooler.supabase.com");
}

/**
 * Converte URI `db.<ref>.supabase.co` para o Shared Pooler (IPv4),
 * usando `SUPABASE_POOLER_HOST` (obrigatório), ex.:
 *   aws-0-us-east-1.pooler.supabase.com
 *
 * mode:
 * - transaction → :6543 + pgbouncer (serverless)
 * - session → :5432 (VPS / backend persistente — recomendado)
 */
export function rewriteSupabaseDirectToPooler(
  databaseUrl: string,
  mode: "transaction" | "session",
  poolerHost = process.env.SUPABASE_POOLER_HOST?.trim(),
): string {
  if (!poolerHost) return databaseUrl;

  let u: URL;
  try {
    u = new URL(databaseUrl);
  } catch {
    return databaseUrl;
  }

  const directRef = extractDirectDbProjectRef(u.hostname);
  if (!directRef) return databaseUrl;

  const password = decodeURIComponent(u.password);
  const user = u.username.includes(".") ? u.username : `postgres.${directRef}`;
  const port = mode === "transaction" ? "6543" : "5432";
  const dbName = u.pathname && u.pathname !== "/" ? u.pathname : "/postgres";

  const out = new URL(`postgresql://${poolerHost}:${port}${dbName}`);
  out.username = user;
  out.password = password;

  u.searchParams.forEach((value, key) => {
    out.searchParams.set(key, value);
  });

  out.searchParams.set("sslmode", out.searchParams.get("sslmode") || "require");
  if (mode === "transaction") {
    out.searchParams.set("pgbouncer", "true");
    if (!out.searchParams.has("connection_limit")) {
      out.searchParams.set("connection_limit", "1");
    }
  } else {
    out.searchParams.delete("pgbouncer");
    out.searchParams.delete("connection_limit");
  }

  return out.toString();
}

/**
 * Normaliza URLs Supabase para funcionar em VPS (IPv4):
 * - sempre sslmode=require
 * - se for db.* e houver SUPABASE_POOLER_HOST, reescreve para o pooler
 * - em runtime de VPS, mode session (5432) é o padrão recomendado
 */
export function normalizeSupabaseDatabaseUrl(
  databaseUrl: string,
  opts?: { role?: "runtime" | "direct" },
): string {
  const role = opts?.role ?? "runtime";
  let url = databaseUrl;

  try {
    const parsed = new URL(url);
    if (!isSupabaseHost(parsed.hostname)) return databaseUrl;

    if (extractDirectDbProjectRef(parsed.hostname) && process.env.SUPABASE_POOLER_HOST?.trim()) {
      // VPS persistente: session pooler para runtime e DIRECT_URL.
      // Transaction (6543) só se SUPABASE_POOLER_MODE=transaction.
      const preferTransaction =
        process.env.SUPABASE_POOLER_MODE?.trim().toLowerCase() === "transaction";
      const mode =
        role === "runtime" && preferTransaction ? "transaction" : "session";
      url = rewriteSupabaseDirectToPooler(url, mode);
    }

    const u = new URL(url);
    if (!u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }

    if (
      role === "runtime" &&
      isSupabasePoolerHost(u.hostname) &&
      (u.port === "6543" || u.searchParams.get("pgbouncer") === "true")
    ) {
      u.searchParams.set("pgbouncer", "true");
      if (!u.searchParams.has("connection_limit")) {
        u.searchParams.set("connection_limit", "1");
      }
    }

    return u.toString();
  } catch {
    return databaseUrl;
  }
}

/** @deprecated use normalizeSupabaseDatabaseUrl */
export function ensurePostgresSslMode(databaseUrl: string): string {
  return normalizeSupabaseDatabaseUrl(databaseUrl, { role: "runtime" });
}
