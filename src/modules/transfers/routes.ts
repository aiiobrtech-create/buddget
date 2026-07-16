import { FastifyInstance } from "fastify";
import { ok } from "../../common/http/response";
import { requireAuth } from "../../common/middleware/auth";
import { ensurePermission } from "../../common/middleware/authorization";
import { createTransferSchema } from "./schemas";
import * as service from "./service";

export async function transferRoutes(app: FastifyInstance) {
  app.get("/transfers", { preHandler: [requireAuth, ensurePermission("TRANSFERS_READ")] }, async () => {
    return ok(await service.listTransfers());
  });

  app.post("/transfers", { preHandler: [requireAuth, ensurePermission("TRANSFERS_WRITE")] }, async (request) => {
    return ok(await service.createTransfer({ ...createTransferSchema.parse(request.body), requesterId: request.user.sub }));
  });
}
