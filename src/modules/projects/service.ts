import { prisma } from "../../config/prisma";
import { ConflictError, NotFoundError } from "../../common/errors/app-error";
import { writeAuditLog } from "../audit-logs/service";

export async function listProjects() {
  return prisma.project.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createProject(data: {
  companyId: string;
  costCenterId?: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  startDate: string;
  endDate?: string;
  actorId?: string;
}) {
  const created = await prisma.project.create({
    data: {
      companyId: data.companyId,
      costCenterId: data.costCenterId,
      code: data.code,
      name: data.name,
      status: data.status,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null
    }
  });
  await writeAuditLog({ module: "projects", entity: "project", entityId: created.id, action: "create", userId: data.actorId, afterJson: created });
  return created;
}

export async function updateProject(id: string, data: Record<string, unknown>, actorId?: string) {
  const before = await prisma.project.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Project not found");
  const patch: Record<string, unknown> = { ...data };
  if (typeof patch.startDate === "string") patch.startDate = new Date(patch.startDate);
  if (typeof patch.endDate === "string") patch.endDate = new Date(patch.endDate);
  const updated = await prisma.project.update({ where: { id }, data: patch });
  await writeAuditLog({ module: "projects", entity: "project", entityId: id, action: "update", userId: actorId, beforeJson: before, afterJson: updated });
  return updated;
}

export async function deleteProject(id: string, actorId?: string) {
  const before = await prisma.project.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Project not found");

  const links = await prisma.$transaction([
    prisma.budgetLine.count({ where: { projectId: id } }),
    prisma.actual.count({ where: { projectId: id } })
  ]);
  if (links.reduce((a, b) => a + b, 0) > 0) throw new ConflictError("Project has linked records and cannot be removed");

  await prisma.project.delete({ where: { id } });
  await writeAuditLog({ module: "projects", entity: "project", entityId: id, action: "delete", userId: actorId, beforeJson: before });
  return { deleted: true };
}
