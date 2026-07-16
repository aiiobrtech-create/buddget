/**
 * Diagnóstico rápido de conexão com o banco (rodar na VPS):
 *   npx tsx scripts/check-db.ts
 * ou, em produção buildada:
 *   node -e "require('dotenv').config(); const {PrismaClient}=require('@prisma/client'); ..."
 */
import { PrismaClient } from "@prisma/client";
import { config as loadDotenv } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

const envPath = [resolve(process.cwd(), ".env"), resolve(__dirname, "../.env")].find((p) => existsSync(p));
if (envPath) loadDotenv({ path: envPath });
else loadDotenv();

function maskUrl(url: string | undefined) {
  if (!url) return "(vazio)";
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "(URL inválida)";
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  const directUrl = process.env.DIRECT_URL?.trim() ?? "";
  console.log("cwd=", process.cwd());
  console.log("envFile=", envPath ?? "(não encontrado)");
  console.log("NODE_ENV=", process.env.NODE_ENV ?? "(não definido)");
  console.log("DATABASE_URL=", maskUrl(databaseUrl));
  console.log("DIRECT_URL=", maskUrl(directUrl));

  if (!databaseUrl) {
    throw new Error("DATABASE_URL vazio. Configure o .env na raiz do app na VPS.");
  }
  if (/localhost|127\.0\.0\.1/i.test(databaseUrl)) {
    throw new Error("DATABASE_URL aponta para localhost — na VPS isso não é o Supabase.");
  }

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    await prisma.$queryRaw`SELECT 1`;
    const users = await prisma.user.count({ where: { deletedAt: null } });
    console.log("OK: conectado. users=", users);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("FALHA:", e instanceof Error ? e.message : e);
  process.exit(1);
});
