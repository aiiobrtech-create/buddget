import { FastifyInstance } from "fastify";
import { authRoutes } from "../modules/auth/routes";
import { userRoutes } from "../modules/users/routes";
import { roleRoutes } from "../modules/roles/routes";
import { companyRoutes } from "../modules/companies/routes";
import { costCenterRoutes } from "../modules/cost-centers/routes";
import { taxonomyRoutes } from "../modules/categories/routes";
import { projectRoutes } from "../modules/projects/routes";
import { supplierRoutes } from "../modules/suppliers/routes";
import { budgetRoutes } from "../modules/budgets/routes";
import { budgetLineRoutes } from "../modules/budget-lines/routes";
import { actualRoutes } from "../modules/actuals/routes";
import { forecastRoutes } from "../modules/forecasts/routes";
import { budgetRequestRoutes } from "../modules/budget-requests/routes";
import { transferRoutes } from "../modules/transfers/routes";
import { importRoutes } from "../modules/imports/routes";
import { dashboardRoutes } from "../modules/dashboard/routes";
import { reportRoutes } from "../modules/reports/routes";
import { auditLogRoutes } from "../modules/audit-logs/routes";
import { mastersBridgeRoutes } from "../modules/masters-bridge/routes";
import { frontendBridgeRoutes } from "../modules/frontend-bridge/routes";

export async function registerRoutes(app: FastifyInstance) {
  await app.register(
    async (api) => {
      await api.register(authRoutes);
      await api.register(mastersBridgeRoutes);
      await api.register(frontendBridgeRoutes);
      await api.register(userRoutes);
      await api.register(roleRoutes);
      await api.register(companyRoutes);
      await api.register(costCenterRoutes);
      await api.register(taxonomyRoutes);
      await api.register(projectRoutes);
      await api.register(supplierRoutes);
      await api.register(budgetRoutes);
      await api.register(budgetLineRoutes);
      await api.register(actualRoutes);
      await api.register(forecastRoutes);
      await api.register(budgetRequestRoutes);
      await api.register(transferRoutes);
      await api.register(importRoutes);
      await api.register(dashboardRoutes);
      await api.register(reportRoutes);
      await api.register(auditLogRoutes);
    },
    { prefix: "/api" },
  );
}
