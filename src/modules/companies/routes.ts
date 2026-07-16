import { FastifyInstance } from "fastify";
import { ok } from "../../common/http/response";
import { requireAuth } from "../../common/middleware/auth";
import { ensurePermission } from "../../common/middleware/authorization";
import { createCompanySchema, updateCompanySchema } from "./schemas";
import * as service from "./service";

export async function companyRoutes(app: FastifyInstance) {
  app.get("/companies", { preHandler: [requireAuth, ensurePermission("COMPANIES_READ")] }, async () => ok(await service.listCompanies()));

  app.post("/companies", { preHandler: [requireAuth, ensurePermission("COMPANIES_WRITE")] }, async (request) => {
    return ok(await service.createCompany({ ...createCompanySchema.parse(request.body), actorId: request.user.sub }));
  });

  app.patch("/companies/:id", { preHandler: [requireAuth, ensurePermission("COMPANIES_WRITE")] }, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await service.updateCompany(id, updateCompanySchema.parse(request.body), request.user.sub));
  });

  app.delete("/companies/:id", { preHandler: [requireAuth, ensurePermission("COMPANIES_WRITE")] }, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await service.deleteCompany(id, request.user.sub));
  });
}
