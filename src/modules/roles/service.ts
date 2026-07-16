import { prisma } from "../../config/prisma";

export async function listRoles() {
  return prisma.role.findMany({
    include: { permissions: { include: { permission: true } } },
    orderBy: { name: "asc" }
  });
}

export async function listPermissions() {
  return prisma.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] });
}
