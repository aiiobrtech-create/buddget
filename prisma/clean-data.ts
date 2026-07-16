import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/common/utils/password";

const prisma = new PrismaClient();

/**
 * Remove dados de negócio (cadastros, orçamentos, movimentações, sessões e escopos).
 * Mantém usuários, papéis e permissões.
 *
 * Evita TRUNCATE … CASCADE em companies: a FK users.company_id faria o Postgres
 * truncar também a tabela users.
 */
async function main() {
  const usersBefore = await prisma.user.findMany({
    select: { email: true },
    orderBy: { email: "asc" },
  });

  await prisma.$executeRawUnsafe(`UPDATE users SET company_id = NULL`);

  // DELETE (não TRUNCATE CASCADE) para não arrastar a tabela users via FK.
  const deletes = [
    "file_attachments",
    "audit_logs",
    "export_jobs",
    "transfers",
    "budget_requests",
    "forecasts",
    "actuals",
    "budget_lines",
    "budget_versions",
    "budgets",
    "import_batches",
    "budget_items",
    "cost_centers",
    "budget_natures",
    "budget_categories",
    "budget_classes",
    "suppliers",
    "projects",
    "companies",
    "company_groups",
    "auth_sessions",
    "user_access_scopes",
  ];

  for (const table of deletes) {
    await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
  }

  let usersAfter = await prisma.user.findMany({
    select: { email: true },
    orderBy: { email: "asc" },
  });

  if (usersAfter.length === 0) {
    const adminRole = await prisma.role.findUnique({ where: { code: "ADMIN" } });
    if (!adminRole) {
      throw new Error("Papel ADMIN não encontrado. Execute npm run db:setup.");
    }
    const passwordHash = await hashPassword("Admin@123456");
    await prisma.user.create({
      data: {
        name: "BUDDGET Admin",
        email: "admin@buddget.local",
        passwordHash,
        roleId: adminRole.id,
        timezone: "America/Sao_Paulo",
      },
    });
    usersAfter = await prisma.user.findMany({
      select: { email: true },
      orderBy: { email: "asc" },
    });
    console.log("Nenhum usuário restava na base; admin padrão recriado.");
    console.log("Login: admin@buddget.local / Admin@123456");
  } else if (usersBefore.length > 0 && usersBefore.length !== usersAfter.length) {
    throw new Error(
      `Esperava manter ${usersBefore.length} usuário(s), restaram ${usersAfter.length}.`,
    );
  }

  const roles = await prisma.role.count();
  const companies = await prisma.company.count();
  const actuals = await prisma.actual.count();
  console.log(
    `Base limpa. Mantidos ${usersAfter.length} usuário(s) e ${roles} papel(is): ${usersAfter
      .map((u) => u.email)
      .join(", ")}`,
  );
  console.log(`Verificação: companies=${companies}, actuals=${actuals}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
