import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/common/utils/password";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Administrador";

  if (!email || !password) {
    throw new Error("Defina ADMIN_EMAIL e ADMIN_PASSWORD no ambiente.");
  }

  const adminRole = await prisma.role.findUnique({ where: { code: "ADMIN" } });
  if (!adminRole) {
    throw new Error("Papel ADMIN não encontrado. Execute npm run db:setup.");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, roleId: adminRole.id, status: "ACTIVE", deletedAt: null },
    create: {
      name,
      email,
      passwordHash,
      roleId: adminRole.id,
      timezone: "America/Sao_Paulo",
    },
  });

  console.log(`Admin configurado: ${user.email} (${user.name})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
