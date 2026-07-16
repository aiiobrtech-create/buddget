import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/common/utils/password";

const prisma = new PrismaClient();

/** Redefine senha de um usuário existente (sem apagar dados). */
async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  const password = process.argv[3] ?? "";
  if (!email || !password) {
    throw new Error("Uso: npx tsx prisma/reset-user-password.ts <email> <novaSenha>");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt) {
    throw new Error(`Usuário não encontrado: ${email}`);
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, status: "ACTIVE", deletedAt: null },
  });

  // Encerra sessões antigas para forçar novo login.
  await prisma.authSession.deleteMany({ where: { userId: user.id } });

  console.log(`Senha atualizada para ${email} (status ACTIVE).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
