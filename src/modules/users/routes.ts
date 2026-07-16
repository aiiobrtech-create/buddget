import { FastifyInstance } from "fastify";
import { ok } from "../../common/http/response";
import { requireAuth } from "../../common/middleware/auth";
import { ensurePermission } from "../../common/middleware/authorization";
import { createUserSchema, updateUserSchema } from "./schemas";
import * as userService from "./service";

export async function userRoutes(app: FastifyInstance) {
  app.get("/users", { preHandler: [requireAuth, ensurePermission("USERS_READ")] }, async () => ok(await userService.listUsers()));
  app.post("/users", { preHandler: [requireAuth, ensurePermission("USERS_WRITE")] }, async (request) => ok(await userService.createUser({ ...createUserSchema.parse(request.body), actorId: request.user.sub })));
  app.patch("/users/:id", { preHandler: [requireAuth, ensurePermission("USERS_WRITE")] }, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await userService.updateUser(id, updateUserSchema.parse(request.body), request.user.sub));
  });
  app.delete("/users/:id", { preHandler: [requireAuth, ensurePermission("USERS_WRITE")] }, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await userService.deleteUser(id, request.user.sub));
  });
}
