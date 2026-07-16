import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import multipart from "@fastify/multipart";
import { env } from "../config/env";
import { errorHandler } from "../common/http/error-handler";
import { registerRoutes } from "./routes";
import { registerFrontend } from "../main/register-frontend";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true, credentials: true });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
  });

  await app.register(jwt, {
    namespace: "refreshJwt",
    secret: env.JWT_REFRESH_SECRET,
    sign: { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "BUDDGET API",
        version: "1.0.0"
      },
      security: [{ bearerAuth: [] }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          }
        }
      }
    }
  });

  await app.register(swaggerUi, { routePrefix: "/docs" });
  await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });

  app.setErrorHandler(errorHandler);

  app.get("/health", async () => ({ status: "ok" }));

  await registerRoutes(app);
  await registerFrontend(app);

  return app;
}
