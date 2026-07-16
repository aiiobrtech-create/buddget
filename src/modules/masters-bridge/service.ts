import { prisma } from "../../config/prisma";
import {
  mapCategory,
  mapCompany,
  mapCompanyGroup,
  mapBudgetItem,
  mapCostCenter,
  mapLedgerClass,
  mapNature,
  mapProject,
  mapRoleProfile,
  mapUser,
} from "./mappers";

export async function listCompanyGroups() {
  const rows = await prisma.companyGroup.findMany({ orderBy: { code: "asc" } });
  return rows.map(mapCompanyGroup);
}

export async function listCompanies() {
  const rows = await prisma.company.findMany({ orderBy: { code: "asc" } });
  return rows.map(mapCompany);
}

export async function listCostCenters() {
  const rows = await prisma.costCenter.findMany({ orderBy: [{ categoryId: "asc" }, { code: "asc" }] });
  return rows.map(mapCostCenter);
}

export async function listBudgetItems() {
  const rows = await prisma.budgetItem.findMany({ orderBy: [{ costCenterId: "asc" }, { code: "asc" }] });
  return rows.map(mapBudgetItem);
}

export async function listFrontendClasses() {
  const rows = await prisma.budgetCategory.findMany({ orderBy: [{ displayOrder: "asc" }, { code: "asc" }] });
  return rows.map(mapLedgerClass);
}

export async function listFrontendCategories() {
  const rows = await prisma.budgetClass.findMany({ orderBy: { displayOrder: "asc" } });
  return rows.map(mapCategory);
}

export async function listFrontendNatures() {
  const rows = await prisma.budgetNature.findMany({ orderBy: { displayOrder: "asc" } });
  return rows.map(mapNature);
}

export async function listProjects() {
  const rows = await prisma.project.findMany({ orderBy: { code: "asc" } });
  return rows.map(mapProject);
}

export async function listUsers() {
  const rows = await prisma.user.findMany({
    where: { deletedAt: null },
    include: { role: true },
    orderBy: { name: "asc" },
  });
  return rows.map(mapUser);
}

export async function listRoles() {
  const rows = await prisma.role.findMany({ orderBy: { name: "asc" } });
  return rows.map(mapRoleProfile);
}
