import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../common/errors/app-error";
import { hashPassword } from "../../common/utils/password";
import { writeAuditLog } from "../audit-logs/service";

export async function listUsers() {
  return prisma.user.findMany({ where: { deletedAt: null }, include: { role: true, company: true }, orderBy: { createdAt: "desc" } });
}

export async function createUser(data: { name: string; email: string; password: string; companyId?: string; roleId: string; timezone: string; actorId?: string; }) {
  const passwordHash = await hashPassword(data.password);
  const created = await prisma.user.create({ data: { name: data.name, email: data.email, passwordHash, companyId: data.companyId, roleId: data.roleId, timezone: data.timezone } });
  await writeAuditLog({ module: "users", entity: "user", entityId: created.id, action: "create", userId: data.actorId, afterJson: created });
  return created;
}

export async function updateUser(id: string, data: Record<string, unknown>, actorId?: string) {
  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("User not found");
  const patch: Record<string, unknown> = { ...data };
  if (typeof data.password === "string") {
    patch.passwordHash = await hashPassword(data.password);
    delete patch.password;
  }
  const updated = await prisma.user.update({ where: { id }, data: patch });
  await writeAuditLog({ module: "users", entity: "user", entityId: id, action: "update", userId: actorId, beforeJson: before, afterJson: updated });
  return updated;
}

export async function deleteUser(id: string, actorId?: string) {
  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("User not found");
  const deleted = await prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } });
  await writeAuditLog({ module: "users", entity: "user", entityId: id, action: "delete", userId: actorId, beforeJson: before, afterJson: deleted });
  return { deleted: true };
}
