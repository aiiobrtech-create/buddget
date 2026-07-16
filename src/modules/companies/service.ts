import { prisma } from "../../config/prisma";
import { ConflictError, NotFoundError } from "../../common/errors/app-error";
import { writeAuditLog } from "../audit-logs/service";

export async function listCompanies() {
  return prisma.company.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createCompany(data: {
  code: string;
  name: string;
  legalName?: string;
  cnpj?: string;
  companyGroupId?: string;
  status: "ACTIVE" | "INACTIVE";
  actorId?: string;
}) {
  const { actorId, companyGroupId, cnpj, ...rest } = data;
  const created = await prisma.company.create({
    data: {
      ...rest,
      cnpj: cnpj?.trim() || undefined,
      companyGroupId: companyGroupId ?? undefined,
    },
  });
  await writeAuditLog({ module: "companies", entity: "company", entityId: created.id, action: "create", userId: actorId, afterJson: created });
  return created;
}

export async function updateCompany(id: string, data: Record<string, unknown>, actorId?: string) {
  const before = await prisma.company.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Company not found");
  const { companyGroupId, cnpj, ...rest } = data;
  const updated = await prisma.company.update({
    where: { id },
    data: {
      ...rest,
      ...(cnpj !== undefined ? { cnpj: typeof cnpj === "string" && cnpj.trim() ? cnpj.trim() : null } : {}),
      ...(companyGroupId !== undefined ? { companyGroupId: (companyGroupId as string) || null } : {}),
    },
  });
  await writeAuditLog({ module: "companies", entity: "company", entityId: id, action: "update", userId: actorId, beforeJson: before, afterJson: updated });
  return updated;
}

export async function deleteCompany(id: string, actorId?: string) {
  const before = await prisma.company.findUnique({ where: { id }, include: { _count: { select: { users: true, budgets: true, costCenters: true, projects: true } } } });
  if (!before) throw new NotFoundError("Company not found");
  if (before._count.users + before._count.budgets + before._count.costCenters + before._count.projects > 0) {
    throw new ConflictError("Company has linked records and cannot be removed");
  }
  await prisma.company.delete({ where: { id } });
  await writeAuditLog({ module: "companies", entity: "company", entityId: id, action: "delete", userId: actorId, beforeJson: before });
  return { deleted: true };
}
