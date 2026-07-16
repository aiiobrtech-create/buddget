import { z } from "zod";
import {
  loadProjectEnv,
  normalizeSupabaseDatabaseUrl,
  extractDirectDbProjectRef,
  isSupabaseDirectDbHost,
  isSupabasePoolerHost,
} from "./load-env";

const loadedEnvPath = loadProjectEnv();
if (process.env.NODE_ENV !== "test" && loadedEnvPath) {
  // eslint-disable-next-line no-console
  console.info(`[env] carregado de ${loadedEnvPath}`);
} else if (process.env.NODE_ENV !== "test" && !process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn("[env] .env não encontrado; usando apenas variáveis do processo");
}

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

function maskDbUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "(inválida)";
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
          `Na VPS use o **Session pooler** (Connect → Session, porta 5432, host *.pooler.supabase.com).`,
      );
    }
    if (process.env.NODE_ENV === "production") return s;
    return DEFAULT_LOCAL_DATABASE_URL;
  }, z.string().min(1)),
  DIRECT_URL: z.preprocess((val) => {
    const s = typeof val === "string" ? val.trim() : "";
    return s.length > 0 ? s : undefined;
  }, z.string().optional()),
  /** Ex.: aws-0-us-east-1.pooler.supabase.com — copie do botão Connect do Supabase */
  SUPABASE_POOLER_HOST: z.string().optional(),
  /** transaction | session (padrão session para VPS) */
  SUPABASE_POOLER_MODE: z.string().optional(),
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
      `Dica Supabase: use Connection Pooler (Session) do botão Connect — db.* é IPv6-only.`,
  );
}

const data = parsed.data;

if (isSupabaseCloudProjectUrl(data.SUPABASE_URL)) {
  if (!isSupabasePostgresHost(data.DATABASE_URL)) {
    throw new Error(
      `DATABASE_URL não aponta para o Postgres do Supabase (hostname esperado: *.supabase.co ou *.pooler.supabase.com).\n` +
        `Painel: ${supabaseProjectDashboardDatabase(extractSupabaseProjectRef(data.SUPABASE_URL) ?? "SEU_REF")}`,
    );
  }
  if (looksLikeLocalPostgres(data.DATABASE_URL)) {
    throw new Error(
      `DATABASE_URL está em localhost, mas SUPABASE_URL é um projeto Supabase.\n` +
        `Use a connection string do painel (Connect → Session pooler).`,
    );
  }
  const rawDirect = typeof process.env.DIRECT_URL === "string" ? process.env.DIRECT_URL.trim() : "";
  if (rawDirect.length === 0) {
    throw new Error(
      `Defina DIRECT_URL no .env (Session pooler :5432 ou a mesma URI de DATABASE_URL se já for pooler session).`,
    );
  }
  if (looksLikeLocalPostgres(rawDirect)) {
    throw new Error("DIRECT_URL não pode ser localhost quando o banco é Supabase.");
  }
  if (!isSupabasePostgresHost(rawDirect)) {
    throw new Error("DIRECT_URL deve ser uma connection string do Supabase.");
  }

  // Em produção, db.* (IPv6) sem pooler configurado → falha explícita
  try {
    const dbHost = new URL(data.DATABASE_URL).hostname;
    if (
      data.NODE_ENV === "production" &&
      isSupabaseDirectDbHost(dbHost) &&
      !process.env.SUPABASE_POOLER_HOST?.trim()
    ) {
      throw new Error(
        `DATABASE_URL usa db.*.supabase.co (somente IPv6). Em VPS isso falha.\n` +
          `1) No Supabase: Connect → Session pooler → copie a URI (host *.pooler.supabase.com:5432)\n` +
          `2) Cole em DATABASE_URL e DIRECT_URL\n` +
          `   OU defina SUPABASE_POOLER_HOST=aws-0-<regiao>.pooler.supabase.com (mesmo host do Connect)\n` +
          `Docs: https://supabase.com/docs/guides/database/connecting-to-postgres`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("somente IPv6")) throw e;
  }
}

const databaseUrl = normalizeSupabaseDatabaseUrl(data.DATABASE_URL, { role: "runtime" });
const directUrl = normalizeSupabaseDatabaseUrl(data.DIRECT_URL ?? data.DATABASE_URL, { role: "direct" });

if (process.env.NODE_ENV !== "test") {
  try {
    const runtimeHost = new URL(databaseUrl).hostname;
    const rawHost = new URL(data.DATABASE_URL).hostname;
    if (extractDirectDbProjectRef(rawHost) && isSupabasePoolerHost(runtimeHost)) {
      // eslint-disable-next-line no-console
      console.info(`[env] DATABASE_URL reescrita para pooler IPv4: ${maskDbUrl(databaseUrl)}`);
    } else if (isSupabaseDirectDbHost(runtimeHost)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[env] DATABASE_URL ainda é db.* (IPv6). Em VPS defina Session pooler ou SUPABASE_POOLER_HOST. Atual: ${maskDbUrl(databaseUrl)}`,
      );
    }
  } catch {
    /* ignore */
  }
}

if (databaseUrl.includes("pgbouncer=true") && directUrl === databaseUrl) {
  throw new Error(
    `DATABASE_URL (transaction/pgbouncer) e DIRECT_URL ficaram idênticas. ` +
      `Use Session (:5432) em DIRECT_URL ou nas duas se for VPS persistente.`,
  );
}

export const env = {
  ...data,
  DATABASE_URL: databaseUrl,
  DIRECT_URL: directUrl,
};

process.env.DATABASE_URL = databaseUrl;
process.env.DIRECT_URL = directUrl;
