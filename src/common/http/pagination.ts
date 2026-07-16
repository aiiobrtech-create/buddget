import { FastifyRequest } from "fastify";

export function readPagination(request: FastifyRequest) {
  const query = request.query as { page?: string; pageSize?: string };
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? 20);

  return {
    page: page > 0 ? page : 1,
    pageSize: pageSize > 0 && pageSize <= 100 ? pageSize : 20,
    skip: (page - 1) * pageSize
  };
}

