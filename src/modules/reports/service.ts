import { createExport } from "../exports/service";
import * as dashboardService from "../dashboard/service";

export async function budgetVsActual(companyId?: string) {
  const summary = await dashboardService.summary(companyId);
  const monthly = await dashboardService.monthly(companyId);
  return {
    summary,
    monthly
  };
}

export async function dashboardExport(format: "csv" | "xlsx" | "pdf", companyId: string | undefined, actorId: string) {
  return createExport("dashboard", format, { companyId }, actorId);
}
