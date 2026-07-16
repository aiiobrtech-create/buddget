import { FastifyInstance } from "fastify";
import { ValidationError } from "../../common/errors/app-error";
import { ok } from "../../common/http/response";
import { requireAuth } from "../../common/middleware/auth";
import { ensurePermission } from "../../common/middleware/authorization";
import { listAuditLogs } from "../audit-logs/query-service";
import * as mastersBridge from "../masters-bridge/service";
import * as actualService from "../actuals/service";
import { createAdminUserSchema, updateAdminUserSchema } from "../users/admin-schemas";
import * as adminUserService from "../users/admin-service";
import { mapActualCreateToBackend, mapActualUpdateToBackend } from "../masters-bridge/mappers";
import * as reportService from "../reports/service";
import * as service from "./service";

function pickCompanyId(query: Record<string, unknown>): string | undefined {
  const raw = query.companyId ?? query.companyIds;
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  return raw
    .split(",")
    .map((s) => s.trim())
    .find((id) => id && id !== "all");
}

function pickBudgetId(query: Record<string, unknown>): string | undefined {
  const raw = query.budgetId ?? query.budgetIds;
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  return raw
    .split(",")
    .map((s) => s.trim())
    .find((id) => id && id !== "all");
}

function pickVersionId(query: Record<string, unknown>): string | undefined {
  if (typeof query.versionId === "string" && query.versionId.trim()) return query.versionId.trim();
  return undefined;
}

export async function frontendBridgeRoutes(app: FastifyInstance) {
  app.get(
    "/dashboard/executive",
    { preHandler: [requireAuth, ensurePermission("DASHBOARD_READ")] },
    async (request) => {
      const query = request.query as Record<string, unknown>;
      const versionId = await service.resolveBudgetVersionId({
        versionId: pickVersionId(query),
        budgetId: pickBudgetId(query),
      });
      const payload = {
        ...query,
        ...(versionId ? { versionId } : {}),
      };
      return ok(await service.getExecutiveDashboard(payload, request.user.sub, request.user.roleCode));
    },
  );

  app.get(
    "/dashboard/alerts",
    { preHandler: [requireAuth, ensurePermission("DASHBOARD_READ")] },
    async (request) => {
      const query = request.query as Record<string, unknown>;
      const versionId = await service.resolveBudgetVersionId({
        versionId: pickVersionId(query),
        budgetId: pickBudgetId(query),
      });
      return ok({
        items: await service.getExecutiveAlerts({
          ...query,
          ...(versionId ? { versionId } : {}),
        }, request.user.sub, request.user.roleCode),
      });
    },
  );

  app.get(
    "/resumo/orcamento",
    { preHandler: [requireAuth, ensurePermission("DASHBOARD_READ")] },
    async (request) => {
      const query = request.query as Record<string, unknown>;
      return ok(await service.getBudgetResumo(query));
    },
  );

  app.get(
    "/budgets/planning",
    { preHandler: [requireAuth, ensurePermission("BUDGET_LINES_READ")] },
    async (request) => {
      const { versionId } = request.query as { versionId?: string };
      if (!versionId) return ok({ rows: [] });
      return ok(await service.getPlanningTable(versionId, request.user.sub, request.user.roleCode));
    },
  );

  app.post(
    "/budgets/versions/draft",
    { preHandler: [requireAuth, ensurePermission("BUDGET_LINES_WRITE")] },
    async (request) => {
      const body = request.body as { versionId?: string; lines?: Array<Record<string, unknown>> };
      if (!body.versionId) return ok({ ok: false });
      return ok(await service.savePlanningDraft(body.versionId, body.lines ?? []));
    },
  );

  app.get(
    "/actuals",
    { preHandler: [requireAuth, ensurePermission("ACTUALS_READ")] },
    async (request) =>
      ok(await service.listActualsForFrontend(request.query as Record<string, unknown>, request.user.sub, request.user.roleCode)),
  );

  app.get(
    "/actuals/:id",
    { preHandler: [requireAuth, ensurePermission("ACTUALS_READ")] },
    async (request) => {
      const { id } = request.params as { id: string };
      return ok(await service.getActualById(id));
    },
  );

  app.post(
    "/actuals",
    { preHandler: [requireAuth, ensurePermission("ACTUALS_WRITE")] },
    async (request) => {
      const body = request.body as Record<string, unknown>;
      const payload = mapActualCreateToBackend(body, request.user.sub);
      const natureId = await service.resolveNatureIdForFrontendCategory(String(body.categoryId ?? ""));
      if (!natureId) throw new ValidationError("Categoria inválida para o lançamento.");
      const created = await actualService.createActual({
        ...payload,
        natureId,
        classId: String(body.categoryId ?? payload.classId),
        categoryId: String(body.classId ?? payload.categoryId),
      });
      return ok({ id: created.id });
    },
  );

  app.patch(
    "/actuals/:id",
    { preHandler: [requireAuth, ensurePermission("ACTUALS_WRITE")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      const payload = mapActualUpdateToBackend(body, request.user.sub);
      if (body.categoryId !== undefined) {
        const natureId = await service.resolveNatureIdForFrontendCategory(String(body.categoryId));
        if (!natureId) throw new ValidationError("Categoria inválida para o lançamento.");
        payload.natureId = natureId;
      }
      return ok(await actualService.updateActual(id, payload, request.user.sub));
    },
  );

  app.delete(
    "/actuals/:id",
    { preHandler: [requireAuth, ensurePermission("ACTUALS_WRITE")] },
    async (request) => {
      const { id } = request.params as { id: string };
      return ok(await actualService.deleteActual(id, request.user.sub));
    },
  );

  app.get(
    "/admin/users",
    { preHandler: [requireAuth, ensurePermission("USERS_READ")] },
    async () => ok({ items: await adminUserService.listUsersForAdmin() }),
  );

  app.post(
    "/admin/users",
    { preHandler: [requireAuth, ensurePermission("USERS_WRITE")] },
    async (request) =>
      ok(
        await adminUserService.createUserForAdmin({
          ...createAdminUserSchema.parse(request.body),
          actorId: request.user.sub,
        }),
      ),
  );

  app.patch(
    "/admin/users/:id",
    { preHandler: [requireAuth, ensurePermission("USERS_WRITE")] },
    async (request) => {
      const { id } = request.params as { id: string };
      return ok(
        await adminUserService.updateUserForAdmin(
          id,
          updateAdminUserSchema.parse(request.body),
          request.user.sub,
        ),
      );
    },
  );

  app.delete(
    "/admin/users/:id",
    { preHandler: [requireAuth, ensurePermission("USERS_WRITE")] },
    async (request) => {
      const { id } = request.params as { id: string };
      return ok(await adminUserService.deleteUserForAdmin(id, request.user.sub));
    },
  );

  app.get(
    "/admin/audit-logs",
    { preHandler: [requireAuth, ensurePermission("AUDIT_READ")] },
    async () => {
      const result = await listAuditLogs(1, 100);
      return ok({
        items: result.rows.map((row) => ({
          id: row.id,
          at: row.createdAt.toISOString(),
          actor: row.actorName,
          action: row.action,
          entity: row.entity,
          entityId: row.entityId ?? "",
          description: row.description,
        })),
      });
    },
  );

  app.get(
    "/admin/parameters",
    { preHandler: [requireAuth, ensurePermission("USERS_READ")] },
    async () => ok({ items: [] }),
  );

  app.get(
    "/admin/integrations",
    { preHandler: [requireAuth, ensurePermission("USERS_READ")] },
    async () => ok({ items: [] }),
  );

  app.post("/auth/forgot-password", async () => ok({ ok: true }));

  app.get(
    "/forecasts/revisions",
    { preHandler: [requireAuth, ensurePermission("FORECASTS_READ")] },
    async (request) => ok(await service.listForecastRevisions(request.query as Record<string, unknown>, request.user.sub, request.user.roleCode)),
  );

  app.post(
    "/forecasts/revisions",
    { preHandler: [requireAuth, ensurePermission("FORECASTS_WRITE")] },
    async (request) => {
      const body = request.body as { label?: string; baseVersionId?: string };
      return ok(
        await service.createForecastRevision({
          label: String(body.label ?? ""),
          baseVersionId: String(body.baseVersionId ?? ""),
          actorId: request.user.sub,
        }),
      );
    },
  );

  app.patch(
    "/forecasts/revisions/:id",
    { preHandler: [requireAuth, ensurePermission("FORECASTS_WRITE")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as { label?: string; baseVersionId?: string; forecastAmount?: number };
      return ok(await service.updateForecastRevision(id, body, request.user.sub));
    },
  );

  app.delete(
    "/forecasts/revisions/:id",
    { preHandler: [requireAuth, ensurePermission("FORECASTS_WRITE")] },
    async (request) => {
      const { id } = request.params as { id: string };
      return ok(await service.deleteForecastRevision(id, request.user.sub));
    },
  );

  app.get(
    "/reports/comparative",
    { preHandler: [requireAuth, ensurePermission("REPORTS_READ")] },
    async (request) => ok(await service.getComparativeReport(request.query as Record<string, unknown>, request.user.sub, request.user.roleCode)),
  );

  app.get(
    "/reports/definitions",
    { preHandler: [requireAuth, ensurePermission("REPORTS_READ")] },
    async () =>
      ok([
        { key: "exec_summary", title: "Resumo executivo", description: "KPIs consolidados por empresa." },
        { key: "variance_detail", title: "Detalhamento de desvios", description: "Linha a linha com hierarquia." },
        { key: "cc_execution", title: "Execução por centro de custo", description: "% de execução e saldos." },
      ]),
  );

  app.post(
    "/reports/export",
    { preHandler: [requireAuth, ensurePermission("EXPORTS_RUN")] },
    async (request) => {
      const body = request.body as { kind?: string; reportKey?: string; filters?: { companyId?: string } };
      const format = (body.kind === "pdf" ? "pdf" : body.kind === "xlsx" ? "xlsx" : "csv") as "csv" | "xlsx" | "pdf";
      const companyId = body.filters?.companyId;
      const exported = await reportService.dashboardExport(format, companyId, request.user.sub);
      return ok({
        path: exported.filePath,
        signedUrl: exported.signedUrl,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });
    },
  );
}
