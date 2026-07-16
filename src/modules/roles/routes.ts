import { FastifyInstance } from "fastify";
import { ok } from "../../common/http/response";
import { requireAuth } from "../../common/middleware/auth";
import { ensurePermission } from "../../common/middleware/authorization";
import * as roleService from "./service";

export async function roleRoutes(app: FastifyInstance) {
  app.get("/roles", { preHandler: [requireAuth, ensurePermission("USERS_READ")] }, async () => {
    return ok(await roleService.listRoles());
  });

  app.get("/permissions", { preHandler: [requireAuth, ensurePermission("USERS_READ")] }, async () => {
    return ok(await roleService.listPermissions());
  });
}
