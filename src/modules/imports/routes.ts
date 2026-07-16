import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ok } from "../../common/http/response";
import { requireAuth } from "../../common/middleware/auth";
import { ensurePermission } from "../../common/middleware/authorization";
import { runMasterDataImport } from "./service";

const querySchema = z.object({
  type: z.enum(["suppliers", "projects", "cost-centers"])
});

export async function importRoutes(app: FastifyInstance) {
  app.post("/imports/master", { preHandler: [requireAuth, ensurePermission("IMPORTS_RUN")] }, async (request) => {
    querySchema.parse(request.query ?? {});
    return ok(await runMasterDataImport(request, request.user.sub));
  });
}
