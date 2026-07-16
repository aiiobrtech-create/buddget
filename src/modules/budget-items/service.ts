import { prisma } from "../../config/prisma";
import { ConflictError, NotFoundError } from "../../common/errors/app-error";
import { writeAuditLog } from "../audit-logs/service";

export async function listBudgetItems() {
  return prisma.budgetItem.findMany({ orderBy: [{ costCenterId: "asc" }, { code: "asc" }] });
}

export async function createBudgetItem(data: {
  costCenterId: string;
  companyId?: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  actorId?: string;
}) {
  const { actorId, costCenterId, companyId, code, name, status } = data;
  const created = await prisma.budgetItem.create({
    data: { costCenterId, companyId, code, name, status },
  });
  await writeAuditLog({
    module: "budget-items",
    entity: "budget_item",
    entityId: created.id,
    action: "create",
    userId: actorId,
    afterJson: created,
  });
  return created;
}

export async function updateBudgetItem(id: string, data: Record<string, unknown>, actorId?: string) {
  const before = await prisma.budgetItem.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Budget item not found");
  const { actorId: _ignored, ...patch } = data;
  const updated = await prisma.budgetItem.update({ where: { id }, data: patch });
  await writeAuditLog({
    module: "budget-items",
    entity: "budget_item",
    entityId: id,
    action: "update",
    userId: actorId,
    beforeJson: before,
    afterJson: updated,
  });
  return updated;
}

export async function deleteBudgetItem(id: string, actorId?: string) {
  const before = await prisma.budgetItem.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Budget item not found");

  const linked = await prisma.$transaction([
    prisma.budgetLine.count({ where: { budgetItemId: id } }),
  ]);

  if (linked.reduce((a, b) => a + b, 0) > 0) {
    throw new ConflictError("Item possui linhas de orçamento vinculadas e não pode ser removido");
  }

  await prisma.budgetItem.delete({ where: { id } });
  await writeAuditLog({
    module: "budget-items",
    entity: "budget_item",
    entityId: id,
    action: "delete",
    userId: actorId,
    beforeJson: before,
  });
  return { deleted: true };
}
