import { FastifyInstance } from "fastify";
import { ok } from "../../common/http/response";
import { requireAuth } from "../../common/middleware/auth";
import { ensurePermission } from "../../common/middleware/authorization";
import { createBudgetLineSchema, updateBudgetLineSchema } from "./schemas";
import * as service from "./service";
import { runBudgetLineImport } from "../imports/service";

export async function budgetLineRoutes(app: FastifyInstance) {
  app.get("/budget-lines", { preHandler: [requireAuth, ensurePermission("BUDGET_LINES_READ")] }, async (request) => ok(await service.listBudgetLines((request.query as { versionId?: string }).versionId)));
  app.post("/budget-lines", { preHandler: [requireAuth, ensurePermission("BUDGET_LINES_WRITE")] }, async (request) => ok(await service.createBudgetLine({ ...createBudgetLineSchema.parse(request.body), actorId: request.user.sub })));
  app.patch("/budget-lines/:id", { preHandler: [requireAuth, ensurePermission("BUDGET_LINES_WRITE")] }, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await service.updateBudgetLine(id, updateBudgetLineSchema.parse(request.body), request.user.sub));
  });
  app.delete("/budget-lines/:id", { preHandler: [requireAuth, ensurePermission("BUDGET_LINES_WRITE")] }, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await service.deleteBudgetLine(id, request.user.sub));
  });
  app.post("/budget-lines/import", { preHandler: [requireAuth, ensurePermission("IMPORTS_RUN")] }, async (request) => ok(await runBudgetLineImport(request, request.user.sub)));
}
