import { FastifyInstance } from "fastify";
import { ok } from "../../common/http/response";
import { requireAuth } from "../../common/middleware/auth";
import * as service from "./service";

export async function taxonomyRoutes(app: FastifyInstance) {
  app.get("/categories", { preHandler: [requireAuth] }, async () => ok(await service.listCategories()));
  app.get("/classes", { preHandler: [requireAuth] }, async () => ok(await service.listClasses()));
  app.get("/natures", { preHandler: [requireAuth] }, async () => ok(await service.listNatures()));
}
