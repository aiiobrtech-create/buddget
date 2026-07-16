import { FastifyInstance } from "fastify";
import { ok } from "../../common/http/response";
import { requireAuth } from "../../common/middleware/auth";
import { ensurePermission } from "../../common/middleware/authorization";
import { createBudgetRequestSchema, reviewBudgetRequestSchema } from "./schemas";
import * as service from "./service";

export async function budgetRequestRoutes(app: FastifyInstance) {
  app.get("/budget-requests", { preHandler: [requireAuth, ensurePermission("REQUESTS_READ")] }, async () => {
    return ok(await service.listBudgetRequests());
  });

  app.post("/budget-requests", { preHandler: [requireAuth, ensurePermission("REQUESTS_WRITE")] }, async (request) => {
    const payload = createBudgetRequestSchema.parse(request.body);
    return ok(await service.createBudgetRequest({ ...payload, requesterId: request.user.sub }));
  });

  app.post("/budget-requests/:id/approve", { preHandler: [requireAuth, ensurePermission("REQUESTS_APPROVE")] }, async (request) => {
    const { id } = request.params as { id: string };
    const payload = reviewBudgetRequestSchema.parse(request.body ?? {});
    return ok(await service.approveBudgetRequest(id, request.user.sub, payload.notes));
  });

  app.post("/budget-requests/:id/reject", { preHandler: [requireAuth, ensurePermission("REQUESTS_APPROVE")] }, async (request) => {
    const { id } = request.params as { id: string };
    const payload = reviewBudgetRequestSchema.parse(request.body ?? {});
    return ok(await service.rejectBudgetRequest(id, request.user.sub, payload.notes));
  });

  app.post("/budget-requests/:id/cancel", { preHandler: [requireAuth, ensurePermission("REQUESTS_WRITE")] }, async (request) => {
    const { id } = request.params as { id: string };
    const payload = reviewBudgetRequestSchema.parse(request.body ?? {});
    return ok(await service.cancelBudgetRequest(id, request.user.sub, payload.notes));
  });
}
