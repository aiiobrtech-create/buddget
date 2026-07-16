import { FastifyInstance } from "fastify";
import { ok } from "../../common/http/response";
import { requireAuth } from "../../common/middleware/auth";
import { loginSchema, logoutSchema, refreshSchema } from "./schemas";
import * as authService from "./service";
import { toFrontendAuthResponse } from "./frontend-response";
import { mapRoleCode } from "../masters-bridge/mappers";

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (request) => {
    const payload = loginSchema.parse(request.body);
    const result = await authService.login(app, request, payload.email, payload.password);
    return ok(toFrontendAuthResponse(result));
  });

  app.post("/auth/refresh", async (request) => {
    const payload = refreshSchema.parse(request.body);
    const result = await authService.refresh(app, request, payload.refreshToken);
    return ok({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: toFrontendAuthResponse(result).tokens.expiresAt,
    });
  });

  app.post("/auth/logout", { preHandler: [requireAuth] }, async (request) => {
    logoutSchema.parse(request.body ?? {});
    await authService.logout(request);
    return ok({ success: true });
  });

  app.get("/me", { preHandler: [requireAuth] }, async (request) => {
    const profile = await authService.me(request.user.sub);
    if (!profile) return ok(null);
    return ok({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: mapRoleCode(profile.role.code),
      allowResumo: profile.allowResumo,
      access: profile.access,
    });
  });
}
