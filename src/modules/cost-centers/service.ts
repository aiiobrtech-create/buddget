import { prisma } from "../../config/prisma";
import { ConflictError, NotFoundError } from "../../common/errors/app-error";
import { writeAuditLog } from "../audit-logs/service";

export async function listCostCenters() {
  return prisma.costCenter.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createCostCenter(data: {
  categoryId: string;
  companyId?: string;
  code: string;
  name: string;
  managerUserId?: string;
  status: "ACTIVE" | "INACTIVE";
  actorId?: string;
}) {
  const { actorId, categoryId, companyId, code, name, managerUserId, status } = data;
  const created = await prisma.costCenter.create({
    data: { categoryId, companyId, code, name, managerUserId, status },
  });
  await writeAuditLog({ module: "cost-centers", entity: "cost_center", entityId: created.id, action: "create", userId: actorId, afterJson: created });
  return created;
}

export async function updateCostCenter(id: string, data: Record<string, unknown>, actorId?: string) {
  const before = await prisma.costCenter.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Cost center not found");
  const { actorId: _ignored, ...patch } = data;
  const updated = await prisma.costCenter.update({ where: { id }, data: patch });
  await writeAuditLog({ module: "cost-centers", entity: "cost_center", entityId: id, action: "update", userId: actorId, beforeJson: before, afterJson: updated });
  return updated;
}

export async function deleteCostCenter(id: string, actorId?: string) {
  const before = await prisma.costCenter.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Cost center not found");

  const projectCount = await prisma.project.count({ where: { costCenterId: id } });
  if (projectCount > 0) {
    throw new ConflictError(
      `Centro de custo possui vínculos e não pode ser removido: ${projectCount} projeto(s).`,
    );
  }

  const summary = await prisma.$transaction(async (tx) => {
    const lineIds = (
      await tx.budgetLine.findMany({ where: { costCenterId: id }, select: { id: true } })
    ).map((line) => line.id);

    if (lineIds.length > 0) {
      await tx.transfer.deleteMany({
        where: {
          OR: [{ sourceBudgetLineId: { in: lineIds } }, { targetBudgetLineId: { in: lineIds } }],
        },
      });
    }

    const [linesDeleted, actualsDeleted, itemsDeleted] = await Promise.all([
      tx.budgetLine.deleteMany({ where: { costCenterId: id } }),
      tx.actual.deleteMany({ where: { costCenterId: id } }),
      tx.budgetItem.deleteMany({ where: { costCenterId: id } }),
    ]);

    await tx.costCenter.delete({ where: { id } });

    return {
      linesDeleted: linesDeleted.count,
      actualsDeleted: actualsDeleted.count,
      itemsDeleted: itemsDeleted.count,
    };
  });

  await writeAuditLog({
    module: "cost-centers",
    entity: "cost_center",
    entityId: id,
    action: "delete",
    userId: actorId,
    beforeJson: before,
    afterJson: summary,
  });
  return { deleted: true, ...summary };
}
