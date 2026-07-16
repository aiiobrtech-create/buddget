import { prisma } from "../../config/prisma";
import { ConflictError, NotFoundError } from "../../common/errors/app-error";
import { writeAuditLog } from "../audit-logs/service";

export async function listSuppliers() {
  return prisma.supplier.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createSupplier(data: {
  legalName: string;
  tradeName?: string;
  document: string;
  email?: string;
  phone?: string;
  status: "ACTIVE" | "INACTIVE";
  actorId?: string;
}) {
  const created = await prisma.supplier.create({ data });
  await writeAuditLog({ module: "suppliers", entity: "supplier", entityId: created.id, action: "create", userId: data.actorId, afterJson: created });
  return created;
}

export async function updateSupplier(id: string, data: Record<string, unknown>, actorId?: string) {
  const before = await prisma.supplier.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Supplier not found");
  const updated = await prisma.supplier.update({ where: { id }, data });
  await writeAuditLog({ module: "suppliers", entity: "supplier", entityId: id, action: "update", userId: actorId, beforeJson: before, afterJson: updated });
  return updated;
}

export async function deleteSupplier(id: string, actorId?: string) {
  const before = await prisma.supplier.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Supplier not found");
  const links = await prisma.$transaction([
    prisma.budgetLine.count({ where: { supplierId: id } }),
    prisma.actual.count({ where: { supplierId: id } })
  ]);
  if (links.reduce((a, b) => a + b, 0) > 0) throw new ConflictError("Supplier has linked records and cannot be removed");
  await prisma.supplier.delete({ where: { id } });
  await writeAuditLog({ module: "suppliers", entity: "supplier", entityId: id, action: "delete", userId: actorId, beforeJson: before });
  return { deleted: true };
}
