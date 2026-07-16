import { FastifyInstance } from "fastify";
import { ok } from "../../common/http/response";
import { requireAuth } from "../../common/middleware/auth";
import { ensurePermission } from "../../common/middleware/authorization";
import { createProjectSchema, updateProjectSchema } from "./schemas";
import * as service from "./service";

export async function projectRoutes(app: FastifyInstance) {
  app.get("/projects", { preHandler: [requireAuth, ensurePermission("BUDGETS_READ")] }, async () => ok(await service.listProjects()));
  app.post("/projects", { preHandler: [requireAuth, ensurePermission("BUDGETS_WRITE")] }, async (request) => ok(await service.createProject({ ...createProjectSchema.parse(request.body), actorId: request.user.sub })));
  app.patch("/projects/:id", { preHandler: [requireAuth, ensurePermission("BUDGETS_WRITE")] }, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await service.updateProject(id, updateProjectSchema.parse(request.body), request.user.sub));
  });
  app.delete("/projects/:id", { preHandler: [requireAuth, ensurePermission("BUDGETS_WRITE")] }, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await service.deleteProject(id, request.user.sub));
  });
}
