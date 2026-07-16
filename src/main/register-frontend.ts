import path from "node:path";
import { pathToFileURL } from "node:url";
import type { FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import middie from "@fastify/middie";
import { env } from "../config/env";

const frontendRoot = path.resolve(__dirname, "../../frontend");
const frontendDist = path.join(frontendRoot, "dist");

function isBackendRoute(url: string) {
  const pathOnly = url.split("?")[0] ?? url;
  return pathOnly.startsWith("/api") || pathOnly.startsWith("/docs") || pathOnly.startsWith("/health");
}

async function createViteDevServer() {
  const viteEntry = path.join(frontendRoot, "node_modules", "vite", "dist", "node", "index.js");
  const { createServer } = (await import(pathToFileURL(viteEntry).href)) as typeof import("vite");
  return createServer({
    root: frontendRoot,
    configFile: path.join(frontendRoot, "vite.config.ts"),
    server: { middlewareMode: true },
    appType: "spa",
  });
}

export async function registerFrontend(app: FastifyInstance) {
  if (env.NODE_ENV === "production") {
    await app.register(fastifyStatic, {
      root: frontendDist,
      prefix: "/",
    });

    app.setNotFoundHandler((request, reply) => {
      if (isBackendRoute(request.url)) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Not found" } });
      }
      return reply.sendFile("index.html");
    });
    return;
  }

  await app.register(middie);
  const vite = await createViteDevServer();

  app.use((req, res, next) => {
    const url = req.url ?? "/";
    if (isBackendRoute(url)) {
      next();
      return;
    }
    vite.middlewares(req, res, next);
  });
}
