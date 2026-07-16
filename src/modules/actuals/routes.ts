import { FastifyInstance } from "fastify";
import { ok } from "../../common/http/response";
import { requireAuth } from "../../common/middleware/auth";
import { ensurePermission } from "../../common/middleware/authorization";
import { runActualImport } from "../imports/service";

export async function actualRoutes(app: FastifyInstance) {
  // Import only — PATCH/DELETE served by frontend-bridge with field mapping.
  app.post("/actuals/import", { preHandler: [requireAuth, ensurePermission("IMPORTS_RUN")] }, async (request) => ok(await runActualImport(request, request.user.sub)));
}
