import { prisma } from "../../config/prisma";
import { ConflictError, NotFoundError } from "../../common/errors/app-error";
import { writeAuditLog } from "../audit-logs/service";

export async function listBudgetRequests() {
  return prisma.budgetRequest.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createBudgetRequest(data: {
  type: "REINFORCEMENT" | "TRANSFER" | "CREATION" | "ADJUSTMENT";
  companyId: string;
  costCenterId: string;
  categoryId?: string;
  classId?: string;
  natureId?: string;
  requestedAmount: number;
  justification: string;
  priority: string;
  requesterId: string;
}) {
  const created = await prisma.budgetRequest.create({
    data: {
      type: data.type,
      requesterId: data.requesterId,
      companyId: data.companyId,
      costCenterId: data.costCenterId,
      categoryId: data.categoryId,
      classId: data.classId,
      natureId: data.natureId,
      requestedAmount: data.requestedAmount,
      justification: data.justification,
      priority: data.priority
    }
  });

  await writeAuditLog({
    module: "budget-requests",
    entity: "budget_request",
    entityId: created.id,
    action: "create",
    userId: data.requesterId,
    afterJson: created
  });

  return created;
}

async function transitionStatus(id: string, status: "APPROVED" | "REJECTED" | "CANCELED", actorId: string, notes?: string) {
  const before = await prisma.budgetRequest.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Request not found");

  if (before.status !== "PENDING") {
    throw new ConflictError("Only pending requests can transition");
  }

  const updated = await prisma.budgetRequest.update({
    where: { id },
    data: {
      status,
      reviewerId: status === "CANCELED" ? undefined : actorId,
      reviewNotes: notes,
      approvedAt: status === "APPROVED" ? new Date() : undefined,
      rejectedAt: status === "REJECTED" ? new Date() : undefined,
      canceledAt: status === "CANCELED" ? new Date() : undefined
    }
  });

  await writeAuditLog({
    module: "budget-requests",
    entity: "budget_request",
    entityId: id,
    action: status.toLowerCase(),
    userId: actorId,
    beforeJson: before,
    afterJson: updated
  });

  return updated;
}

export const approveBudgetRequest = (id: string, actorId: string, notes?: string) => transitionStatus(id, "APPROVED", actorId, notes);
export const rejectBudgetRequest = (id: string, actorId: string, notes?: string) => transitionStatus(id, "REJECTED", actorId, notes);
export const cancelBudgetRequest = (id: string, actorId: string, notes?: string) => transitionStatus(id, "CANCELED", actorId, notes);
