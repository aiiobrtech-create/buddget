import { FastifyInstance } from "fastify";
import { ok } from "../../common/http/response";
import { requireAuth } from "../../common/middleware/auth";
import { ensurePermission } from "../../common/middleware/authorization";
import { createForecastSchema, updateForecastSchema } from "./schemas";
import * as service from "./service";

export async function forecastRoutes(app: FastifyInstance) {
  app.get("/forecasts", { preHandler: [requireAuth, ensurePermission("FORECASTS_READ")] }, async (request) => ok(await service.listForecasts((request.query as { versionId?: string }).versionId)));
  app.post("/forecasts", { preHandler: [requireAuth, ensurePermission("FORECASTS_WRITE")] }, async (request) => ok(await service.createForecast(createForecastSchema.parse(request.body))));
  app.patch("/forecasts/:id", { preHandler: [requireAuth, ensurePermission("FORECASTS_WRITE")] }, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await service.updateForecast(id, updateForecastSchema.parse(request.body), request.user.sub));
  });
  app.delete("/forecasts/:id", { preHandler: [requireAuth, ensurePermission("FORECASTS_WRITE")] }, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await service.deleteForecast(id, request.user.sub));
  });
}
