import { FastifyReply, FastifyRequest } from "fastify";
import { UnauthorizedError } from "../errors/app-error";

export async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    throw new UnauthorizedError();
  }
}

