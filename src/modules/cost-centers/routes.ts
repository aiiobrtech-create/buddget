import { FastifyInstance } from "fastify";
import { ok } from "../../common/http/response";
import { requireAuth } from "../../common/middleware/auth";
import { ensurePermission } from "../../common/middleware/authorization";
import { createCostCenterSchema, updateCostCenterSchema } from "./schemas";
import * as service from "./service";

export async function costCenterRoutes(app: FastifyInstance) {
  app.get("/cost-centers", { preHandler: [requireAuth, ensurePermission("COST_CENTERS_READ")] }, async () => ok(await service.listCostCenters()));

  app.post("/cost-centers", { preHandler: [requireAuth, ensurePermission("COST_CENTERS_WRITE")] }, async (request) => {
    return ok(await service.createCostCenter({ ...createCostCenterSchema.parse(request.body), actorId: request.user.sub }));
  });

  app.patch("/cost-centers/:id", { preHandler: [requireAuth, ensurePermission("COST_CENTERS_WRITE")] }, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await service.updateCostCenter(id, updateCostCenterSchema.parse(request.body), request.user.sub));
  });

  app.delete("/cost-centers/:id", { preHandler: [requireAuth, ensurePermission("COST_CENTERS_WRITE")] }, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await service.deleteCostCenter(id, request.user.sub));
  });
}
