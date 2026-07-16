import { ConflictError, NotFoundError } from "../../common/errors/app-error";
import { hashPassword } from "../../common/utils/password";
import { prisma } from "../../config/prisma";
import { mapUser } from "../masters-bridge/mappers";
import { writeAuditLog } from "../audit-logs/service";
import {
  EMPTY_USER_ACCESS,
  getAccessScopesForUsers,
  getUserAccess,
  saveUserAccess,
  type UserAccessPayload,
} from "./access-scopes";

function frontendRoleToDbCode(role: string): string {
  const normalized = role.trim().toLowerCase();
  if (normalized === "admin") return "ADMIN";
  if (normalized === "operador") return "OPERADOR";
  if (normalized === "consulta") return "CONSULTA";
  return role.trim().toUpperCase();
}

async function resolveRoleId(role: string) {
  const code = frontendRoleToDbCode(role);
  const row = await prisma.role.findUnique({ where: { code } });
  if (!row) throw new NotFoundError(`Papel não encontrado: ${role}`);
  return row.id;
}

export async function listUsersForAdmin() {
  const rows = await prisma.user.findMany({
    where: { deletedAt: null },
    include: { role: true },
    orderBy: { name: "asc" },
  });
  const accessByUser = await getAccessScopesForUsers(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...mapUser(row),
    profileId: row.roleId,
    access: accessByUser.get(row.id) ?? { ...EMPTY_USER_ACCESS },
  }));
}

export async function createUserForAdmin(data: {
  name: string;
  email: string;
  password: string;
  role: string;
  active?: boolean;
  access?: UserAccessPayload;
  allowResumo?: boolean;
  actorId?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing && !existing.deletedAt) {
    throw new ConflictError("E-mail já cadastrado");
  }

  const roleId = await resolveRoleId(data.role);
  const passwordHash = await hashPassword(data.password);
  const created = await prisma.user.create({
    data: {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      passwordHash,
      roleId,
      status: data.active === false ? "INACTIVE" : "ACTIVE",
      allowResumo: data.allowResumo !== false,
    },
    include: { role: true },
  });

  const access = await saveUserAccess(created.id, data.access);
  await writeAuditLog({
    module: "users",
    entity: "user",
    entityId: created.id,
    action: "create",
    userId: data.actorId,
    afterJson: { ...created, access },
  });

  return {
    ...mapUser(created),
    profileId: created.roleId,
    access,
  };
}

export async function updateUserForAdmin(
  id: string,
  data: {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    active?: boolean;
    access?: UserAccessPayload;
    allowResumo?: boolean;
  },
  actorId?: string,
) {
  const before = await prisma.user.findUnique({ where: { id }, include: { role: true } });
  if (!before || before.deletedAt) throw new NotFoundError("User not found");

  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.email !== undefined) patch.email = data.email.trim().toLowerCase();
  if (data.active !== undefined) patch.status = data.active ? "ACTIVE" : "INACTIVE";
  if (data.role !== undefined) patch.roleId = await resolveRoleId(data.role);
  if (data.password) patch.passwordHash = await hashPassword(data.password);
  if (data.allowResumo !== undefined) patch.allowResumo = data.allowResumo;

  const updated = await prisma.user.update({
    where: { id },
    data: patch,
    include: { role: true },
  });

  const access =
    data.access !== undefined ? await saveUserAccess(id, data.access) : await getUserAccess(id);

  await writeAuditLog({
    module: "users",
    entity: "user",
    entityId: id,
    action: "update",
    userId: actorId,
    beforeJson: before,
    afterJson: { ...updated, access },
  });

  return {
    ...mapUser(updated),
    profileId: updated.roleId,
    access,
  };
}

export async function deleteUserForAdmin(id: string, actorId?: string) {
  const before = await prisma.user.findUnique({ where: { id } });
  if (!before || before.deletedAt) throw new NotFoundError("User not found");
  const deleted = await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), status: "INACTIVE" },
  });
  await prisma.userAccessScope.deleteMany({ where: { userId: id } });
  await writeAuditLog({
    module: "users",
    entity: "user",
    entityId: id,
    action: "delete",
    userId: actorId,
    beforeJson: before,
    afterJson: deleted,
  });
  return { deleted: true };
}
