import { FastifyInstance } from "fastify";
import { ok } from "../../common/http/response";
import { requireAuth } from "../../common/middleware/auth";
import { ensurePermission } from "../../common/middleware/authorization";
import * as service from "./service";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard/summary", { preHandler: [requireAuth, ensurePermission("DASHBOARD_READ")] }, async (request) => {
    const companyId = (request.query as { companyId?: string }).companyId;
    return ok(await service.summary(companyId));
  });

  app.get("/dashboard/monthly", { preHandler: [requireAuth, ensurePermission("DASHBOARD_READ")] }, async (request) => {
    const companyId = (request.query as { companyId?: string }).companyId;
    return ok(await service.monthly(companyId));
  });

  app.get("/dashboard/by-category", { preHandler: [requireAuth, ensurePermission("DASHBOARD_READ")] }, async (request) => {
    const companyId = (request.query as { companyId?: string }).companyId;
    return ok(await service.byCategory(companyId));
  });

  app.get("/dashboard/top-deviations", { preHandler: [requireAuth, ensurePermission("DASHBOARD_READ")] }, async (request) => {
    const companyId = (request.query as { companyId?: string }).companyId;
    return ok(await service.topDeviations(companyId));
  });

  app.get("/dashboard/by-cost-center", { preHandler: [requireAuth, ensurePermission("DASHBOARD_READ")] }, async (request) => {
    const companyId = (request.query as { companyId?: string }).companyId;
    return ok(await service.byCostCenter(companyId));
  });
}
