import { prisma } from "../../config/prisma";
import { ConflictError, NotFoundError } from "../../common/errors/app-error";
import * as companyService from "../companies/service";
import * as costCenterService from "../cost-centers/service";
import * as budgetItemService from "../budget-items/service";
import {
  mapCategory,
  mapCompany,
  mapCompanyGroup,
  mapBudgetItem,
  mapCostCenter,
  mapLedgerClass,
} from "./mappers";

function normalizeCnpj(value?: string) {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : undefined;
}

function toStatus(active?: boolean) {
  return active === false ? "INACTIVE" : "ACTIVE";
}

export async function createCompanyGroup(body: {
  code: string;
  name: string;
  description?: string;
  active?: boolean;
}) {
  const row = await prisma.companyGroup.create({
    data: {
      code: body.code,
      name: body.name,
      description: body.description,
      status: toStatus(body.active),
    },
  });
  return mapCompanyGroup(row);
}

export async function updateCompanyGroup(
  id: string,
  body: { name?: string; description?: string; active?: boolean },
) {
  const before = await prisma.companyGroup.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Company group not found");
  const row = await prisma.companyGroup.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      status: body.active === undefined ? undefined : toStatus(body.active),
    },
  });
  return mapCompanyGroup(row);
}

export async function deleteCompanyGroup(id: string) {
  const linked = await prisma.company.count({ where: { companyGroupId: id } });
  if (linked > 0) throw new ConflictError("Grupo possui empresas vinculadas");
  await prisma.companyGroup.delete({ where: { id } });
  return { deleted: true };
}

export async function createCompany(
  body: {
    companyGroupId?: string;
    code: string;
    name: string;
    taxId?: string;
    active?: boolean;
  },
  actorId: string,
) {
  const created = await companyService.createCompany({
    code: body.code,
    name: body.name,
    cnpj: normalizeCnpj(body.taxId),
    companyGroupId: body.companyGroupId,
    status: toStatus(body.active),
    actorId,
  });
  return mapCompany(created);
}

export async function updateCompany(
  id: string,
  body: {
    companyGroupId?: string;
    name?: string;
    taxId?: string;
    active?: boolean;
  },
  actorId: string,
) {
  const updated = await companyService.updateCompany(
    id,
    {
      name: body.name,
      cnpj: body.taxId === undefined ? undefined : normalizeCnpj(body.taxId),
      companyGroupId: body.companyGroupId,
      status: body.active === undefined ? undefined : toStatus(body.active),
    },
    actorId,
  );
  return mapCompany(updated);
}

export async function deleteCompany(id: string, actorId: string) {
  await companyService.deleteCompany(id, actorId);
  return { deleted: true };
}

export async function createCostCenter(
  body: { categoryId: string; companyId?: string; code: string; name: string; active?: boolean },
  actorId: string,
) {
  const created = await costCenterService.createCostCenter({
    categoryId: body.categoryId,
    companyId: body.companyId,
    code: body.code,
    name: body.name,
    status: toStatus(body.active),
    actorId,
  });
  return mapCostCenter(created);
}

export async function updateCostCenter(
  id: string,
  body: { categoryId?: string; companyId?: string; code?: string; name?: string; active?: boolean },
  actorId: string,
) {
  const updated = await costCenterService.updateCostCenter(
    id,
    {
      categoryId: body.categoryId,
      companyId: body.companyId,
      code: body.code,
      name: body.name,
      status: body.active === undefined ? undefined : toStatus(body.active),
    },
    actorId,
  );
  return mapCostCenter(updated);
}

export async function deleteCostCenter(id: string, actorId: string) {
  await costCenterService.deleteCostCenter(id, actorId);
  return { deleted: true };
}

export async function createBudgetItem(
  body: { costCenterId: string; companyId?: string; code: string; name: string; active?: boolean },
  actorId: string,
) {
  const created = await budgetItemService.createBudgetItem({
    costCenterId: body.costCenterId,
    companyId: body.companyId,
    code: body.code,
    name: body.name,
    status: toStatus(body.active),
    actorId,
  });
  return mapBudgetItem(created);
}

export async function updateBudgetItem(
  id: string,
  body: { costCenterId?: string; companyId?: string; code?: string; name?: string; active?: boolean },
  actorId: string,
) {
  const updated = await budgetItemService.updateBudgetItem(
    id,
    {
      costCenterId: body.costCenterId,
      companyId: body.companyId,
      code: body.code,
      name: body.name,
      status: body.active === undefined ? undefined : toStatus(body.active),
    },
    actorId,
  );
  return mapBudgetItem(updated);
}

export async function deleteBudgetItem(id: string, actorId: string) {
  await budgetItemService.deleteBudgetItem(id, actorId);
  return { deleted: true };
}

/** Frontend LedgerClass → budget_classes (BudgetCategory) */
export async function createFrontendClass(body: { companyId: string; code: string; name: string; nature?: string }) {
  const row = await prisma.budgetCategory.create({
    data: {
      companyId: body.companyId,
      code: body.code,
      name: body.name,
      description: body.nature ?? "Despesa",
      status: "ACTIVE",
    },
  });
  return mapLedgerClass(row);
}

export async function updateFrontendClass(
  id: string,
  body: { companyId?: string; code?: string; name?: string; nature?: string },
) {
  const before = await prisma.budgetCategory.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Class not found");
  const row = await prisma.budgetCategory.update({
    where: { id },
    data: {
      companyId: body.companyId,
      code: body.code,
      name: body.name,
      description: body.nature,
    },
  });
  return mapLedgerClass(row);
}

export async function deleteFrontendClass(id: string) {
  const linked = await prisma.budgetClass.count({ where: { classId: id } });
  if (linked > 0) throw new ConflictError("Classe possui categorias vinculadas");
  await prisma.budgetCategory.delete({ where: { id } });
  return { deleted: true };
}

/** Frontend Category → budget_categories (BudgetClass) */
async function assertCategoryCodeAvailable(classId: string, code: string, excludeId?: string) {
  const existing = await prisma.budgetClass.findFirst({
    where: {
      classId,
      code,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  if (existing) {
    throw new ConflictError("Já existe uma categoria com este código nesta classe");
  }
}

export async function createFrontendCategory(body: {
  classId: string;
  code: string;
  name: string;
  active?: boolean;
}) {
  await assertCategoryCodeAvailable(body.classId, body.code);
  const row = await prisma.budgetClass.create({
    data: {
      classId: body.classId,
      code: body.code,
      name: body.name,
      status: toStatus(body.active),
    },
  });
  await prisma.budgetNature.create({
    data: { classId: row.id, code: "1", name: "Padrão", displayOrder: 1 },
  });
  return mapCategory(row);
}

export async function updateFrontendCategory(
  id: string,
  body: { classId?: string; code?: string; name?: string; active?: boolean },
) {
  const before = await prisma.budgetClass.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Category not found");
  const classId = body.classId ?? before.classId;
  const code = body.code ?? before.code;
  await assertCategoryCodeAvailable(classId, code, id);
  const row = await prisma.budgetClass.update({
    where: { id },
    data: {
      classId: body.classId,
      code: body.code,
      name: body.name,
      status: body.active === undefined ? undefined : toStatus(body.active),
    },
  });
  return mapCategory(row);
}

export async function deleteFrontendCategory(id: string) {
  const linked = await prisma.budgetNature.count({ where: { classId: id } });
  if (linked > 0) {
    const used = await prisma.budgetLine.count({ where: { classId: id } });
    if (used > 0) throw new ConflictError("Categoria possui lançamentos vinculados");
  }
  await prisma.budgetNature.deleteMany({ where: { classId: id } });
  await prisma.budgetClass.delete({ where: { id } });
  return { deleted: true };
}
