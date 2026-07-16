import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error";
import { fail } from "./response";

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

  console.error(error);
  return reply.status(500).send(fail("INTERNAL_ERROR", "Unexpected internal error"));
}

