import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error";
import { fail } from "./response";

function isDatabaseConnectivityError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as Error & { code?: string };
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err.name === "PrismaClientInitializationError") return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError && ["P1000", "P1001", "P1002", "P1017"].includes(err.code)) {
    return true;
  }
  const msg = String(err.message ?? "").toLowerCase();
  return (
    msg.includes("can't reach database") ||
    msg.includes("cannot reach database") ||
    msg.includes("econnrefused") ||
    msg.includes("enotfound") ||
    msg.includes("connection timed out") ||
    msg.includes("server has closed the connection") ||
    msg.includes("p1001")
  );
}

export function errorHandler(error: FastifyError | Error, _request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof ZodError) {
    return reply.status(400).send(fail("VALIDATION_ERROR", "Invalid request payload", error.flatten()));
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send(fail(error.code, error.message, error.details));
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return reply
        .status(409)
        .send(fail("CONFLICT", "Registro duplicado para a mesma combinação de planejamento.", error.meta));
    }
    if (error.code === "P2003") {
      return reply.status(400).send(fail("VALIDATION_ERROR", "Referência inválida em cadastro ou planejamento.", error.meta));
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return reply.status(400).send(fail("VALIDATION_ERROR", "Dados inválidos para gravação do planejamento."));
  }

  if (isDatabaseConnectivityError(error)) {
    return reply.status(503).send(
      fail(
        "DATABASE_UNAVAILABLE",
        "Não foi possível conectar ao banco. Na VPS use DATABASE_URL do pooler Supabase (porta 6543, pgbouncer=true, sslmode=require) e reinicie o app.",
      ),
    );
  }

  console.error(error);
  return reply.status(500).send(fail("INTERNAL_ERROR", "Unexpected internal error"));
}
