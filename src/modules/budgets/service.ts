import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ConflictError, NotFoundError, ValidationError } from "../../common/errors/app-error";
import { writeAuditLog } from "../audit-logs/service";

export async function listBudgets(companyId?: string, allowedCompanyIds?: string[]) {
  const where: Prisma.BudgetWhereInput = {};
  if (companyId) {
    if (allowedCompanyIds) {
      where.companyId = allowedCompanyIds.includes(companyId) ? companyId : "none";
    } else {
      where.companyId = companyId;
    }
  } else if (allowedCompanyIds) {
    where.companyId = { in: allowedCompanyIds };
  }

  return prisma.budget.findMany({
    where,
    include: { versions: true },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }]
  });
}

export async function getBudgetById(id: string) {
  const budget = await prisma.budget.findUnique({
    where: { id },
    include: { versions: { include: { lines: true } } }
  });

  if (!budget) throw new NotFoundError("Budget not found");
  return budget;
}

export async function createBudget(data: {
  companyId: string;
  year: number;
  name: string;
  description?: string;
  currency: string;
  actorId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.budget.create({
      data: {
        companyId: data.companyId,
        year: data.year,
        name: data.name,
        description: data.description,
        currency: data.currency,
        createdBy: data.actorId
      }
    });

    await tx.budgetVersion.create({
      data: {
        budgetId: created.id,
        name: "Versao original",
        type: "ORIGINAL",
        versionNumber: 1,
        status: "DRAFT",
        createdBy: data.actorId
      }
    });

    await writeAuditLog({
      module: "budgets",
      entity: "budget",
      entityId: created.id,
      action: "create",
      userId: data.actorId,
      afterJson: created
    });

    return created;
  });
}

export async function createBudgetVersion(budgetId: string, data: { name: string; type: "ORIGINAL" | "REVISION" | "FORECAST"; baseVersionId?: string; actorId: string; }) {
  const budget = await prisma.budget.findUnique({ where: { id: budgetId } });
  if (!budget) throw new NotFoundError("Budget not found");

  const latest = await prisma.budgetVersion.findFirst({
    where: { budgetId },
    orderBy: { versionNumber: "desc" }
  });

  const created = await prisma.budgetVersion.create({
    data: {
      budgetId,
      name: data.name,
      type: data.type,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      status: "DRAFT",
      baseVersionId: data.baseVersionId,
      createdBy: data.actorId
    }
  });

  await writeAuditLog({
    module: "budget-versions",
    entity: "budget_version",
    entityId: created.id,
    action: "create",
    userId: data.actorId,
    afterJson: created
  });

  return created;
}

export async function duplicateVersion(versionId: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const source = await tx.budgetVersion.findUnique({ where: { id: versionId } });
    if (!source) throw new NotFoundError("Version not found");

    const latest = await tx.budgetVersion.findFirst({
      where: { budgetId: source.budgetId },
      orderBy: { versionNumber: "desc" }
    });

    const clone = await tx.budgetVersion.create({
      data: {
        budgetId: source.budgetId,
        name: `${source.name} (copia)`,
        type: source.type,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        status: "DRAFT",
        baseVersionId: source.id,
        createdBy: actorId
      }
    });

    const lines = await tx.budgetLine.findMany({ where: { versionId: source.id } });

    if (lines.length > 0) {
      await tx.budgetLine.createMany({
        data: lines.map((line) => ({
          versionId: clone.id,
          companyId: line.companyId,
          costCenterId: line.costCenterId,
          categoryId: line.categoryId,
          classId: line.classId,
          natureId: line.natureId,
          projectId: line.projectId,
          supplierId: line.supplierId,
          referenceMonth: line.referenceMonth,
          plannedAmount: line.plannedAmount,
          notes: line.notes
        }))
      });
    }

    await writeAuditLog({
      module: "budget-versions",
      entity: "budget_version",
      entityId: clone.id,
      action: "duplicate",
      userId: actorId,
      afterJson: { sourceVersionId: source.id, newVersionId: clone.id }
    });

    return clone;
  });
}

function lineGroupingKey(line: { costCenterId: string; categoryId: string; classId: string; natureId: string; referenceMonth: number }) {
  return `${line.costCenterId}|${line.categoryId}|${line.classId}|${line.natureId}|${line.referenceMonth}`;
}

export async function publishVersion(versionId: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.budgetVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new NotFoundError("Version not found");

    if (version.status !== "DRAFT") {
      throw new ConflictError("Only draft versions can be published");
    }

    const lines = await tx.budgetLine.findMany({ where: { versionId } });
    if (!lines.length) {
      throw new ValidationError("Cannot publish version without budget lines");
    }

    for (const line of lines) {
      if (line.referenceMonth < 1 || line.referenceMonth > 12) {
        throw new ValidationError(`Invalid reference month ${line.referenceMonth}`);
      }

      if (Number(line.plannedAmount) < 0) {
        throw new ValidationError("Planned amount cannot be negative");
      }
    }

    const duplicates = new Set<string>();
    const seen = new Set<string>();
    for (const line of lines) {
      const key = lineGroupingKey(line);
      if (seen.has(key)) duplicates.add(key);
      seen.add(key);
    }

    if (duplicates.size > 0) {
      throw new ConflictError("Version has duplicate logical lines", { duplicates: Array.from(duplicates) });
    }

    await tx.budgetVersion.updateMany({
      where: { budgetId: version.budgetId, status: "PUBLISHED" },
      data: { status: "ARCHIVED" }
    });

    const published = await tx.budgetVersion.update({
      where: { id: versionId },
      data: { status: "PUBLISHED", publishedBy: actorId, publishedAt: new Date() }
    });

    await tx.budget.update({
      where: { id: version.budgetId },
      data: {
        status: "PUBLISHED",
        activeVersionId: versionId,
        publishedAt: new Date()
      }
    });

    await writeAuditLog({
      module: "budget-versions",
      entity: "budget_version",
      entityId: versionId,
      action: "publish",
      userId: actorId,
      beforeJson: version,
      afterJson: published
    });

    return published;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

function budgetYearRange(year: number) {
  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lt: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

async function countActualsForBudgetDeletion(
  tx: Prisma.TransactionClient,
  budget: { id: string; companyId: string; year: number },
) {
  const soleBudget =
    (await tx.budget.count({ where: { companyId: budget.companyId, year: budget.year } })) === 1;

  const where: Prisma.ActualWhereInput = soleBudget
    ? {
        companyId: budget.companyId,
        competenceDate: budgetYearRange(budget.year),
        OR: [{ budgetId: budget.id }, { budgetId: null }],
      }
    : { budgetId: budget.id };

  return tx.actual.count({ where });
}

async function deleteActualsForBudget(
  tx: Prisma.TransactionClient,
  budget: { id: string; companyId: string; year: number },
) {
  const soleBudget =
    (await tx.budget.count({ where: { companyId: budget.companyId, year: budget.year } })) === 1;

  if (soleBudget) {
    await tx.actual.deleteMany({
      where: {
        budgetId: null,
        companyId: budget.companyId,
        competenceDate: budgetYearRange(budget.year),
      },
    });
  }

  const linked = await tx.actual.deleteMany({ where: { budgetId: budget.id } });
  return linked.count;
}

export async function deleteBudget(id: string, actorId: string) {
  const budget = await prisma.budget.findUnique({
    where: { id },
    include: { versions: { select: { id: true } } },
  });
  if (!budget) throw new NotFoundError("Budget not found");

  const versionIds = budget.versions.map((v) => v.id);

  const summary = await prisma.$transaction(async (tx) => {
    const actualsDeleted = await countActualsForBudgetDeletion(tx, budget);

    const lineIds =
      versionIds.length > 0
        ? (
            await tx.budgetLine.findMany({
              where: { versionId: { in: versionIds } },
              select: { id: true },
            })
          ).map((line) => line.id)
        : [];

    if (lineIds.length > 0) {
      await tx.transfer.deleteMany({
        where: {
          OR: [{ sourceBudgetLineId: { in: lineIds } }, { targetBudgetLineId: { in: lineIds } }],
        },
      });
      await tx.budgetLine.deleteMany({ where: { id: { in: lineIds } } });
    }

    await tx.forecast.deleteMany({
      where: versionIds.length > 0 ? { OR: [{ budgetId: id }, { versionId: { in: versionIds } }] } : { budgetId: id },
    });

    const versionsDeleted = await tx.budgetVersion.deleteMany({ where: { budgetId: id } });
    await deleteActualsForBudget(tx, budget);
    await tx.budget.delete({ where: { id } });

    return { linesDeleted: lineIds.length, versionsDeleted: versionsDeleted.count, actualsDeleted };
  });

  await writeAuditLog({
    module: "budgets",
    entity: "budget",
    entityId: id,
    action: "delete",
    userId: actorId,
    beforeJson: budget,
    afterJson: summary,
  });

  return { deleted: true, ...summary };
}

export async function deleteBudgetVersion(id: string, actorId: string) {
  const version = await prisma.budgetVersion.findUnique({ where: { id } });
  if (!version) throw new NotFoundError("Version not found");

  const versionCount = await prisma.budgetVersion.count({ where: { budgetId: version.budgetId } });
  if (versionCount <= 1) {
    throw new ConflictError("Não é possível excluir a única versão do orçamento. Exclua o orçamento inteiro.");
  }

  const budget = await prisma.budget.findUnique({ where: { id: version.budgetId } });
  if (!budget) throw new NotFoundError("Budget not found");

  const linesDeleted = await prisma.$transaction(async (tx) => {
    const lineIds = (
      await tx.budgetLine.findMany({
        where: { versionId: id },
        select: { id: true },
      })
    ).map((line) => line.id);

    if (lineIds.length > 0) {
      await tx.transfer.deleteMany({
        where: {
          OR: [{ sourceBudgetLineId: { in: lineIds } }, { targetBudgetLineId: { in: lineIds } }],
        },
      });
      await tx.budgetLine.deleteMany({ where: { id: { in: lineIds } } });
    }

    await tx.forecast.deleteMany({ where: { versionId: id } });
    await tx.budgetVersion.updateMany({
      where: { baseVersionId: id },
      data: { baseVersionId: null },
    });
    await tx.budgetVersion.delete({ where: { id } });

    if (budget.activeVersionId === id) {
      const fallback = await tx.budgetVersion.findFirst({
        where: { budgetId: version.budgetId, status: "PUBLISHED" },
        orderBy: { versionNumber: "desc" },
      });
      await tx.budget.update({
        where: { id: version.budgetId },
        data: fallback
          ? { activeVersionId: fallback.id, status: "PUBLISHED", publishedAt: fallback.publishedAt }
          : { activeVersionId: null, status: "DRAFT", publishedAt: null },
      });
    }

    return lineIds.length;
  });

  await writeAuditLog({
    module: "budget-versions",
    entity: "budget_version",
    entityId: id,
    action: "delete",
    userId: actorId,
    beforeJson: version,
    afterJson: { linesDeleted },
  });

  return { deleted: true, linesDeleted };
}
