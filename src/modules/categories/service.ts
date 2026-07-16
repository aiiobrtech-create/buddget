import { prisma } from "../../config/prisma";

export async function listCategories() {
  return prisma.budgetCategory.findMany({ orderBy: { displayOrder: "asc" } });
}

export async function listClasses() {
  return prisma.budgetClass.findMany({ orderBy: { displayOrder: "asc" } });
}

export async function listNatures() {
  return prisma.budgetNature.findMany({ orderBy: { displayOrder: "asc" } });
}
