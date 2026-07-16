import { FastifyInstance } from "fastify";
import { paged } from "../../common/http/response";
import { requireAuth } from "../../common/middleware/auth";
import { ensurePermission } from "../../common/middleware/authorization";
import { listAuditLogs } from "./query-service";

export async function auditLogRoutes(app: FastifyInstance) {
  app.get("/audit-logs", { preHandler: [requireAuth, ensurePermission("AUDIT_READ")] }, async (request) => {
    const query = request.query as { page?: string; pageSize?: string };
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    const result = await listAuditLogs(page, pageSize);
    return paged(result.rows, result.pagination);
  });
}
