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
    // dist/config/load-env.js → ../../.env (raiz do app)
    resolve(__dirname, "../../.env"),
    // fallback se o layout mudar
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

/** Supabase exige TLS; URLs sem sslmode falham em várias VPS. */
export function ensurePostgresSslMode(databaseUrl: string): string {
  try {
    const u = new URL(databaseUrl);
    const host = u.hostname.toLowerCase();
    const isSupabase =
      host.endsWith(".supabase.co") ||
      host.endsWith(".pooler.supabase.com") ||
      host.includes("supabase.com");
    if (!isSupabase) return databaseUrl;
    if (!u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    return u.toString();
  } catch {
    return databaseUrl;
  }
}
