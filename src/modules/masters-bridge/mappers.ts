import type { Status } from "@prisma/client";

export function isActive(status: Status) {
  return status === "ACTIVE";
}

export function mapRoleCode(code: string): string {
  const normalized = code.toLowerCase();
  if (normalized === "admin" || normalized === "controller") return "admin";
  if (normalized === "operador" || normalized === "gestor" || normalized === "analista") return "operador";
  if (normalized === "consulta") return "consulta";
  return normalized;
}

export function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Frontend: LedgerClass → budget_classes (BudgetCategory) */
export function mapLedgerClass(row: {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description: string | null;
}) {
  return {
    id: row.id,
    companyId: row.companyId,
    code: row.code,
    name: row.name,
    nature: row.description ?? "Despesa",
  };
}

/** Frontend: Category → budget_categories (BudgetClass) */
export function mapCategory(row: { id: string; classId: string; code: string; name: string; status: Status }) {
  return {
    id: row.id,
    classId: row.classId,
    code: row.code,
    name: row.name,
    active: isActive(row.status),
  };
}

export function mapNature(row: { id: string; code: string; name: string }) {
  return { id: row.id, code: row.code, name: row.name };
}

export function mapCompanyGroup(row: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: Status;
  createdAt: Date;
}) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
    active: isActive(row.status),
    createdAt: toIsoDate(row.createdAt),
  };
}

export function mapCompany(row: {
  id: string;
  companyGroupId: string | null;
  code: string;
  name: string;
  cnpj: string | null;
  status: Status;
  createdAt: Date;
}) {
  return {
    id: row.id,
    companyGroupId: row.companyGroupId ?? "",
    code: row.code,
    name: row.name,
    taxId: row.cnpj ?? undefined,
    active: isActive(row.status),
    createdAt: toIsoDate(row.createdAt),
  };
}

export function mapCostCenter(row: {
  id: string;
  categoryId: string;
  companyId: string | null;
  code: string;
  name: string;
  status: Status;
}) {
  return {
    id: row.id,
    categoryId: row.categoryId,
    companyId: row.companyId ?? undefined,
    code: row.code,
    name: row.name,
    active: isActive(row.status),
  };
}

export function mapBudgetItem(row: {
  id: string;
  costCenterId: string;
  companyId: string | null;
  code: string;
  name: string;
  status: Status;
}) {
  return {
    id: row.id,
    costCenterId: row.costCenterId,
    companyId: row.companyId ?? undefined,
    code: row.code,
    name: row.name,
    active: isActive(row.status),
  };
}

export function mapProject(row: { id: string; code: string; name: string; status: Status }) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    active: isActive(row.status),
  };
}

export function mapUser(row: {
  id: string;
  email: string;
  name: string;
  status: Status;
  role: { code: string; name: string };
  allowResumo?: boolean;
}) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: mapRoleCode(row.role.code),
    active: isActive(row.status),
    allowResumo: row.allowResumo ?? true,
  };
}

export function mapRoleProfile(row: { id: string; code: string; name: string; description: string | null }) {
  return {
    id: row.id,
    key: mapRoleCode(row.code),
    name: row.name,
    description: row.description ?? undefined,
  };
}

/** IDs do frontend ↔ backend (mesmo UUID nas tabelas alinhadas) */
export function frontendClassIdToBackendCategoryId(classId: string) {
  return classId;
}

export function frontendCategoryIdToBackendClassId(categoryId: string) {
  return categoryId;
}

export function mapActualToFrontend(row: {
  id: string;
  companyId: string;
  competenceDate: Date;
  costCenterId: string;
  budgetItemId: string | null;
  categoryId: string;
  classId: string;
  description: string;
  amount: { toString(): string };
  source: string;
  status: Status;
  documentNumber: string | null;
}) {
  const originMap: Record<string, string> = {
    MANUAL: "manual",
    IMPORT: "import",
    INTEGRATION: "integracao",
  };
  const statusMap: Record<string, string> = {
    ACTIVE: "validado",
    INACTIVE: "pendente",
  };
  return {
    id: row.id,
    date: toIsoDate(row.competenceDate),
    companyId: row.companyId,
    costCenterId: row.costCenterId,
    budgetItemId: row.budgetItemId ?? undefined,
    categoryId: row.classId,
    classId: row.categoryId,
    description: row.description,
    amount: Number(row.amount.toString()),
    origin: originMap[row.source] ?? "manual",
    status: statusMap[row.status] ?? "pendente",
    sourceRef: row.documentNumber ?? undefined,
  };
}

export function mapActualCreateToBackend(body: Record<string, unknown>, actorId: string) {
  const originMap: Record<string, "MANUAL" | "IMPORT" | "INTEGRATION"> = {
    manual: "MANUAL",
    import: "IMPORT",
    integracao: "INTEGRATION",
    erp: "INTEGRATION",
  };
  const statusMap: Record<string, "ACTIVE" | "INACTIVE"> = {
    pendente: "INACTIVE",
    validado: "ACTIVE",
    conciliado: "ACTIVE",
  };
  const date = String(body.date ?? new Date().toISOString().slice(0, 10));
  return {
    budgetId: body.budgetId ? String(body.budgetId) : undefined,
    companyId: String(body.companyId),
    launchDate: date,
    competenceDate: date,
    costCenterId: String(body.costCenterId),
    budgetItemId: body.budgetItemId ? String(body.budgetItemId) : undefined,
    categoryId: String(body.classId ?? body.categoryId),
    classId: String(body.categoryId ?? body.classId),
    natureId: body.natureId ? String(body.natureId) : undefined,
    description: String(body.description ?? ""),
    amount: Number(body.amount ?? 0),
    source: originMap[String(body.origin ?? "manual")] ?? "MANUAL",
    status: statusMap[String(body.status ?? "validado")] ?? "ACTIVE",
    documentNumber: body.sourceRef ? String(body.sourceRef) : undefined,
    actorId,
  };
}

export function mapActualUpdateToBackend(body: Record<string, unknown>, actorId: string) {
  const originMap: Record<string, "MANUAL" | "IMPORT" | "INTEGRATION"> = {
    manual: "MANUAL",
    import: "IMPORT",
    integracao: "INTEGRATION",
    erp: "INTEGRATION",
  };
  const statusMap: Record<string, "ACTIVE" | "INACTIVE"> = {
    pendente: "INACTIVE",
    validado: "ACTIVE",
    conciliado: "ACTIVE",
  };
  const patch: Record<string, unknown> = { actorId };

  if (body.date !== undefined) {
    const date = String(body.date);
    patch.launchDate = date;
    patch.competenceDate = date;
  }
  if (body.budgetId !== undefined) patch.budgetId = body.budgetId ? String(body.budgetId) : null;
  if (body.companyId !== undefined) patch.companyId = String(body.companyId);
  if (body.costCenterId !== undefined) patch.costCenterId = String(body.costCenterId);
  if (body.budgetItemId !== undefined) patch.budgetItemId = body.budgetItemId ? String(body.budgetItemId) : null;
  if (body.classId !== undefined || body.categoryId !== undefined) {
    patch.categoryId = String(body.classId ?? body.categoryId);
    patch.classId = String(body.categoryId ?? body.classId);
  }
  if (body.description !== undefined) patch.description = String(body.description);
  if (body.amount !== undefined) patch.amount = Number(body.amount);
  if (body.sourceRef !== undefined) patch.documentNumber = body.sourceRef ? String(body.sourceRef) : null;
  if (body.origin !== undefined) patch.source = originMap[String(body.origin)] ?? "MANUAL";
  if (body.status !== undefined) patch.status = statusMap[String(body.status)] ?? "ACTIVE";

  return patch;
}
