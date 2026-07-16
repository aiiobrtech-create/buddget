import { FastifyInstance } from "fastify";
import { ok } from "../../common/http/response";
import { requireAuth } from "../../common/middleware/auth";
import { ensurePermission } from "../../common/middleware/authorization";
import { createBudgetSchema, createVersionSchema } from "./schemas";
import * as service from "./service";
import { getUserAccess } from "../users/access-scopes";
import { prisma } from "../../config/prisma";

export async function budgetRoutes(app: FastifyInstance) {
  app.get("/budgets", { preHandler: [requireAuth, ensurePermission("BUDGETS_READ")] }, async (request) => {
    const companyId = (request.query as { companyId?: string }).companyId;
    let allowedCompanyIds: string[] | undefined = undefined;

    if (request.user.roleCode !== "ADMIN") {
      const access = await getUserAccess(request.user.sub);
      
      let groupCompanyIds: string[] = [];
      if (access.companyGroupIds && access.companyGroupIds.length > 0) {
        const companies = await prisma.company.findMany({
          where: { companyGroupId: { in: access.companyGroupIds } },
          select: { id: true },
        });
        groupCompanyIds = companies.map((c) => c.id);
      }

      if (access.companyIds && access.companyIds.length > 0) {
        allowedCompanyIds = access.companyIds;
        if (groupCompanyIds.length > 0) {
          allowedCompanyIds = [...new Set([...allowedCompanyIds, ...groupCompanyIds])];
        }
      } else if (groupCompanyIds.length > 0) {
        allowedCompanyIds = groupCompanyIds;
      }
    }

    return ok(await service.listBudgets(companyId, allowedCompanyIds));
  });

  app.post("/budgets", { preHandler: [requireAuth, ensurePermission("BUDGETS_WRITE")] }, async (request) => {
    const payload = createBudgetSchema.parse(request.body);
    return ok(await service.createBudget({ ...payload, actorId: request.user.sub }));
  });

  app.get("/budgets/:id", { preHandler: [requireAuth, ensurePermission("BUDGETS_READ")] }, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await service.getBudgetById(id));
  });

  app.post("/budgets/:id/versions", { preHandler: [requireAuth, ensurePermission("BUDGETS_WRITE")] }, async (request) => {
    const { id } = request.params as { id: string };
    const payload = createVersionSchema.parse(request.body);
    return ok(await service.createBudgetVersion(id, { ...payload, actorId: request.user.sub }));
  });

  app.post("/budget-versions/:id/duplicate", { preHandler: [requireAuth, ensurePermission("BUDGETS_WRITE")] }, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await service.duplicateVersion(id, request.user.sub));
  });

  app.post("/budget-versions/:id/publish", { preHandler: [requireAuth, ensurePermission("BUDGETS_PUBLISH")] }, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await service.publishVersion(id, request.user.sub));
  });

  app.delete("/budgets/:id", { preHandler: [requireAuth, ensurePermission("BUDGETS_WRITE")] }, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await service.deleteBudget(id, request.user.sub));
  });

  app.delete("/budget-versions/:id", { preHandler: [requireAuth, ensurePermission("BUDGETS_WRITE")] }, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await service.deleteBudgetVersion(id, request.user.sub));
  });
}
