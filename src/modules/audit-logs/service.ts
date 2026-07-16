import { prisma } from "../../config/prisma";

type AuditInput = {
  module: string;
  entity: string;
  entityId?: string;
  action: string;
  beforeJson?: unknown;
  afterJson?: unknown;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
};

export async function writeAuditLog(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      module: input.module,
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
      beforeJson: input.beforeJson as object | undefined,
      afterJson: input.afterJson as object | undefined,
      userId: input.userId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    }
  });
}
