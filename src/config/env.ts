import "dotenv/config";
import { z } from "zod";

/** Docker Compose local (só usado se não houver projeto Supabase em `SUPABASE_URL`). */
const DEFAULT_LOCAL_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/buddget";

function isSupabaseCloudProjectUrl(supabaseUrl: string | undefined): boolean {
  if (!supabaseUrl) return false;
  try {
    const host = new URL(supabaseUrl).hostname.toLowerCase();
    return host.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

function supabaseProjectDashboardDatabase(ref: string): string {
  return `https://supabase.com/dashboard/project/${ref}/settings/database`;
}

function extractSupabaseProjectRef(supabaseUrl: string): string | null {
  try {
    const host = new URL(supabaseUrl).hostname.toLowerCase();
    const m = host.match(/^([a-z0-9-]+)\.supabase\.co$/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Hostname costuma ser *.supabase.co, *.pooler.supabase.com ou *supabase.com (AWS pooler). */
function isSupabasePostgresHost(databaseUrl: string): boolean {
  try {
    const h = new URL(databaseUrl).hostname.toLowerCase();
    return (
      h.endsWith(".supabase.co") ||
      h.endsWith(".pooler.supabase.com") ||
      h.includes(".pooler.supabase.com") ||
      h.endsWith("supabase.com")
    );
  } catch {
    return false;
  }
}

function looksLikeLocalPostgres(databaseUrl: string): boolean {
  try {
    const h = new URL(databaseUrl).hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1";
  } catch {
    return false;
  }
}

const envSchema = z.object({
  PORT: z.coerce.number().default(4072),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.preprocess((val) => {
    const s = typeof val === "string" ? val.trim() : "";
    if (s.length > 0) return s;
    if (isSupabaseCloudProjectUrl(process.env.SUPABASE_URL)) {
      const ref = extractSupabaseProjectRef(process.env.SUPABASE_URL ?? "");
      throw new Error(
        `DATABASE_URL está vazio. Com Supabase, copie a URI em Project Settings → Database.\n` +
          (ref ? `Projeto: ${ref} → ${supabaseProjectDashboardDatabase(ref)}\n` : "") +
          `Use Transaction pooler (porta 6543, ?pgbouncer=true) em DATABASE_URL e Session/Direct (5432) em DIRECT_URL para o Prisma.`,
      );
    }
    if (process.env.NODE_ENV === "production") return s;
    return DEFAULT_LOCAL_DATABASE_URL;
  }, z.string().min(1)),
  DIRECT_URL: z.preprocess((val) => {
    const s = typeof val === "string" ? val.trim() : "";
    return s.length > 0 ? s : undefined;
  }, z.string().optional()),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET_IMPORTS: z.string().min(1),
  SUPABASE_STORAGE_BUCKET_EXPORTS: z.string().min(1),
  SUPABASE_STORAGE_BUCKET_ATTACHMENTS: z.string().min(1),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const flat = parsed.error.flatten().fieldErrors;
  throw new Error(
    `Invalid environment variables: ${parsed.error.message}\n` +
      `Campos: ${JSON.stringify(flat, null, 2)}\n` +
      `Dica Supabase: DATABASE_URL / DIRECT_URL em Project Settings → Database (connection string).`,
  );
}

const data = parsed.data;

if (isSupabaseCloudProjectUrl(data.SUPABASE_URL)) {
  if (!isSupabasePostgresHost(data.DATABASE_URL)) {
    throw new Error(
      `DATABASE_URL não aponta para o Postgres do Supabase (hostname esperado: *.supabase.co ou *.pooler.supabase.com).\n` +
        `Atual em: ${supabaseProjectDashboardDatabase(extractSupabaseProjectRef(data.SUPABASE_URL) ?? "SEU_REF")}`,
    );
  }
  if (looksLikeLocalPostgres(data.DATABASE_URL)) {
    throw new Error(
      `DATABASE_URL está em localhost, mas SUPABASE_URL é um projeto Supabase.\n` +
        `Remova o Postgres local do DATABASE_URL e use a connection string do painel (Database → Connection string).`,
    );
  }
  const rawDirect = typeof process.env.DIRECT_URL === "string" ? process.env.DIRECT_URL.trim() : "";
  if (rawDirect.length === 0) {
    throw new Error(
      `Defina DIRECT_URL no .env. O Prisma usa \`directUrl\` no schema; no Supabase use a URI **Session** ou **Direct** (porta 5432). ` +
        `Se DATABASE_URL já for a URI direta (sem PgBouncer), repita a mesma string em DIRECT_URL.`,
    );
  }
  if (data.DATABASE_URL.includes("pgbouncer=true")) {
    if (rawDirect === data.DATABASE_URL || rawDirect.includes("pgbouncer=true")) {
      throw new Error(
        `DATABASE_URL usa PgBouncer; DIRECT_URL deve ser a URI **Session** ou **Direct** (5432, sem ?pgbouncer=true), diferente da URL do pooler.`,
      );
    }
  }
  if (looksLikeLocalPostgres(rawDirect)) {
    throw new Error("DIRECT_URL não pode ser localhost quando o banco é Supabase.");
  }
  if (!isSupabasePostgresHost(rawDirect)) {
    throw new Error(
      "DIRECT_URL deve ser uma connection string do Supabase (Session/Direct ou mesma URI direta de DATABASE_URL).",
    );
  }
}

export const env = {
  ...data,
  DIRECT_URL: data.DIRECT_URL ?? data.DATABASE_URL,
};
