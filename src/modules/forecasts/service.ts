import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../common/errors/app-error";
import { writeAuditLog } from "../audit-logs/service";

export async function listForecasts(versionId?: string) {
  return prisma.forecast.findMany({ where: versionId ? { versionId } : undefined, orderBy: [{ referenceMonth: "asc" }, { createdAt: "desc" }] });
}

export async function createForecast(data: any) {
  const created = await prisma.forecast.upsert({
    where: { versionId_referenceMonth: { versionId: data.versionId, referenceMonth: data.referenceMonth } },
    update: { forecastAmount: data.forecastAmount, methodology: data.methodology, calculationMemory: data.calculationMemory as Prisma.InputJsonValue | undefined },
    create: { budgetId: data.budgetId, versionId: data.versionId, referenceMonth: data.referenceMonth, forecastAmount: data.forecastAmount, methodology: data.methodology, calculationMemory: data.calculationMemory as Prisma.InputJsonValue | undefined }
  });
  await writeAuditLog({ module: "forecasts", entity: "forecast", entityId: created.id, action: "create", afterJson: created });
  return created;
}

export async function updateForecast(id: string, data: Record<string, unknown>, actorId?: string) {
  const before = await prisma.forecast.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Forecast not found");
  const updated = await prisma.forecast.update({
    where: { id },
    data: {
      budgetId: data.budgetId as string | undefined,
      versionId: data.versionId as string | undefined,
      referenceMonth: data.referenceMonth as number | undefined,
      forecastAmount: data.forecastAmount as number | undefined,
      methodology: data.methodology as string | undefined,
      calculationMemory: data.calculationMemory as Prisma.InputJsonValue | undefined
    }
  });
  await writeAuditLog({ module: "forecasts", entity: "forecast", entityId: id, action: "update", userId: actorId, beforeJson: before, afterJson: updated });
  return updated;
}

export async function deleteForecast(id: string, actorId?: string) {
  const before = await prisma.forecast.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Forecast not found");
  await prisma.forecast.delete({ where: { id } });
  await writeAuditLog({ module: "forecasts", entity: "forecast", entityId: id, action: "delete", userId: actorId, beforeJson: before });
  return { deleted: true };
}
