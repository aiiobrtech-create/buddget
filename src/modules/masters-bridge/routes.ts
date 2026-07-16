import { FastifyInstance } from "fastify";
import { ok } from "../../common/http/response";
import { requireAuth } from "../../common/middleware/auth";
import { ensurePermission } from "../../common/middleware/authorization";
import * as service from "./service";
import * as writes from "./writes";

function items<T>(rows: T[]) {
  return ok({ items: rows });
}

export async function mastersBridgeRoutes(app: FastifyInstance) {
  const read = { preHandler: [requireAuth] };
  const writeCompanies = { preHandler: [requireAuth, ensurePermission("COMPANIES_WRITE")] };
  const writeCc = { preHandler: [requireAuth, ensurePermission("COST_CENTERS_WRITE")] };
  const writeItems = { preHandler: [requireAuth, ensurePermission("BUDGET_ITEMS_WRITE")] };

  app.get("/masters/company-groups", read, async () => items(await service.listCompanyGroups()));
  app.post("/masters/company-groups", writeCompanies, async (request) =>
    ok(await writes.createCompanyGroup(request.body as Parameters<typeof writes.createCompanyGroup>[0])),
  );
  app.patch("/masters/company-groups/:id", writeCompanies, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await writes.updateCompanyGroup(id, request.body as Parameters<typeof writes.updateCompanyGroup>[1]));
  });
  app.delete("/masters/company-groups/:id", writeCompanies, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await writes.deleteCompanyGroup(id));
  });

  app.get("/masters/companies", read, async () => items(await service.listCompanies()));
  app.post("/masters/companies", writeCompanies, async (request) =>
    ok(await writes.createCompany(request.body as Parameters<typeof writes.createCompany>[0], request.user.sub)),
  );
  app.patch("/masters/companies/:id", writeCompanies, async (request) => {
    const { id } = request.params as { id: string };
    return ok(
      await writes.updateCompany(id, request.body as Parameters<typeof writes.updateCompany>[1], request.user.sub),
    );
  });
  app.delete("/masters/companies/:id", writeCompanies, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await writes.deleteCompany(id, request.user.sub));
  });

  app.get("/masters/cost-centers", read, async () => items(await service.listCostCenters()));
  app.post("/masters/cost-centers", writeCc, async (request) =>
    ok(await writes.createCostCenter(request.body as Parameters<typeof writes.createCostCenter>[0], request.user.sub)),
  );
  app.patch("/masters/cost-centers/:id", writeCc, async (request) => {
    const { id } = request.params as { id: string };
    return ok(
      await writes.updateCostCenter(id, request.body as Parameters<typeof writes.updateCostCenter>[1], request.user.sub),
    );
  });
  app.delete("/masters/cost-centers/:id", writeCc, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await writes.deleteCostCenter(id, request.user.sub));
  });

  app.get("/masters/budget-items", read, async () => items(await service.listBudgetItems()));
  app.post("/masters/budget-items", writeItems, async (request) =>
    ok(await writes.createBudgetItem(request.body as Parameters<typeof writes.createBudgetItem>[0], request.user.sub)),
  );
  app.patch("/masters/budget-items/:id", writeItems, async (request) => {
    const { id } = request.params as { id: string };
    return ok(
      await writes.updateBudgetItem(id, request.body as Parameters<typeof writes.updateBudgetItem>[1], request.user.sub),
    );
  });
  app.delete("/masters/budget-items/:id", writeItems, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await writes.deleteBudgetItem(id, request.user.sub));
  });

  app.get("/masters/categories", read, async () => items(await service.listFrontendCategories()));
  app.post("/masters/categories", writeCompanies, async (request) =>
    ok(await writes.createFrontendCategory(request.body as Parameters<typeof writes.createFrontendCategory>[0])),
  );
  app.patch("/masters/categories/:id", writeCompanies, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await writes.updateFrontendCategory(id, request.body as Parameters<typeof writes.updateFrontendCategory>[1]));
  });
  app.delete("/masters/categories/:id", writeCompanies, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await writes.deleteFrontendCategory(id));
  });

  app.get("/masters/classes", read, async () => items(await service.listFrontendClasses()));
  app.post("/masters/classes", writeCompanies, async (request) =>
    ok(await writes.createFrontendClass(request.body as Parameters<typeof writes.createFrontendClass>[0])),
  );
  app.patch("/masters/classes/:id", writeCompanies, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await writes.updateFrontendClass(id, request.body as Parameters<typeof writes.updateFrontendClass>[1]));
  });
  app.delete("/masters/classes/:id", writeCompanies, async (request) => {
    const { id } = request.params as { id: string };
    return ok(await writes.deleteFrontendClass(id));
  });

  app.get("/masters/natures", read, async () => items(await service.listFrontendNatures()));
  app.get("/masters/projects", read, async () => items(await service.listProjects()));
  app.get("/masters/users", read, async () => items(await service.listUsers()));
  app.get("/masters/roles", read, async () => items(await service.listRoles()));
}
