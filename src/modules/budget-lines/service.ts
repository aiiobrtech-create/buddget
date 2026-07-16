import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../common/errors/app-error";
import { writeAuditLog } from "../audit-logs/service";

export async function listBudgetLines(versionId?: string) {
  return prisma.budgetLine.findMany({ where: versionId ? { versionId } : undefined, orderBy: [{ referenceMonth: "asc" }, { createdAt: "desc" }] });
}

export async function createBudgetLine(data: any) {
  const created = await prisma.budgetLine.create({ data: { ...data } });
  await writeAuditLog({ module: "budget-lines", entity: "budget_line", entityId: created.id, action: "create", userId: data.actorId, afterJson: created });
  return created;
}

export async function updateBudgetLine(id: string, data: Record<string, unknown>, actorId?: string) {
  const before = await prisma.budgetLine.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Budget line not found");
  const updated = await prisma.budgetLine.update({ where: { id }, data });
  await writeAuditLog({ module: "budget-lines", entity: "budget_line", entityId: id, action: "update", userId: actorId, beforeJson: before, afterJson: updated });
  return updated;
}

export async function deleteBudgetLine(id: string, actorId?: string) {
  const before = await prisma.budgetLine.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Budget line not found");
  await prisma.budgetLine.delete({ where: { id } });
  await writeAuditLog({ module: "budget-lines", entity: "budget_line", entityId: id, action: "delete", userId: actorId, beforeJson: before });
  return { deleted: true };
}
