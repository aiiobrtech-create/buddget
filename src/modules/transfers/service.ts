import { prisma } from "../../config/prisma";
import { ConflictError, NotFoundError } from "../../common/errors/app-error";
import { writeAuditLog } from "../audit-logs/service";

export async function listTransfers() {
  return prisma.transfer.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createTransfer(data: {
  sourceBudgetLineId: string;
  targetBudgetLineId: string;
  amount: number;
  justification: string;
  requesterId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const source = await tx.budgetLine.findUnique({ where: { id: data.sourceBudgetLineId } });
    const target = await tx.budgetLine.findUnique({ where: { id: data.targetBudgetLineId } });

    if (!source || !target) throw new NotFoundError("Source or target line not found");
    if (source.versionId !== target.versionId) throw new ConflictError("Transfer must occur inside same version");
    if (Number(source.plannedAmount) < data.amount) throw new ConflictError("Insufficient source amount for transfer");

    await tx.budgetLine.update({
      where: { id: source.id },
      data: { plannedAmount: { decrement: data.amount } }
    });

    await tx.budgetLine.update({
      where: { id: target.id },
      data: { plannedAmount: { increment: data.amount } }
    });

    const transfer = await tx.transfer.create({
      data: {
        sourceBudgetLineId: source.id,
        targetBudgetLineId: target.id,
        amount: data.amount,
        justification: data.justification,
        requesterId: data.requesterId,
        status: "APPROVED",
        approverId: data.requesterId
      }
    });

    await writeAuditLog({
      module: "transfers",
      entity: "transfer",
      entityId: transfer.id,
      action: "approve",
      userId: data.requesterId,
      afterJson: transfer
    });

    return transfer;
  });
}
