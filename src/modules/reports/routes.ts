import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ok } from "../../common/http/response";
import { requireAuth } from "../../common/middleware/auth";
import { ensurePermission } from "../../common/middleware/authorization";
import * as service from "./service";

const exportSchema = z.object({
  format: z.enum(["csv", "xlsx", "pdf"]).default("csv"),
  companyId: z.string().uuid().optional()
});

export async function reportRoutes(app: FastifyInstance) {
  app.get("/reports/budget-vs-actual", { preHandler: [requireAuth, ensurePermission("REPORTS_READ")] }, async (request) => {
    const query = request.query as { companyId?: string };
    return ok(await service.budgetVsActual(query.companyId));
  });

  app.get("/reports/dashboard-export", { preHandler: [requireAuth, ensurePermission("EXPORTS_RUN")] }, async (request) => {
    const query = exportSchema.parse(request.query ?? {});
    return ok(await service.dashboardExport(query.format, query.companyId, request.user.sub));
  });
}
