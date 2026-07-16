import { FastifyInstance } from "fastify";
import { ok } from "../../common/http/response";
import { requireAuth } from "../../common/middleware/auth";
import { ensurePermission } from "../../common/middleware/authorization";
import { createSupplierSchema, updateSupplierSchema } from "./schemas";
import * as service from "./service";

export async function supplierRoutes(app: FastifyInstance) {
  app.get("/suppliers", { preHandler: [requireAuth, ensurePermission("BUDGETS_READ")] }, async () => ok(await service.listSuppliers()));
  app.post("/suppliers", { preHandler: [requireAuth, ensurePermission("BUDGETS_WRITE")] }, async (request) => ok(await service.createSupplier({ ...createSupplierSchema.parse(request.body), actorId: request.user.sub })));
  app.patch("/suppliers/:id", { preHandler: [requireAuth, ensurePermission("BUDGETS_WRITE")] }, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await service.updateSupplier(id, updateSupplierSchema.parse(request.body), request.user.sub));
  });
  app.delete("/suppliers/:id", { preHandler: [requireAuth, ensurePermission("BUDGETS_WRITE")] }, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await service.deleteSupplier(id, request.user.sub));
  });
}
