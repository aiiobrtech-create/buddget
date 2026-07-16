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

  app.get("/health/db", async (_request, reply) => {
    try {
      const { prisma } = await import("../config/prisma");
      await prisma.$queryRaw`SELECT 1`;
      const users = await prisma.user.count({ where: { deletedAt: null } });
      return { status: "ok", database: "connected", users };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[health/db]", error);
      return reply.status(503).send({
        status: "error",
        database: "unreachable",
        message:
          error instanceof Error
            ? error.message
            : "Falha ao conectar no Postgres (verifique DATABASE_URL / DIRECT_URL / sslmode na VPS).",
      });
    }
  });

  await registerRoutes(app);
  await registerFrontend(app);

  return app;
}
