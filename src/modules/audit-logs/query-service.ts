import { prisma } from "../../config/prisma";
import { buildAuditDescription } from "./summary";

const CRUD_ACTIONS = ["create", "update", "delete"] as const;

type UserRef = { name: string; email: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function resolveActorName(
  userId: string | null,
  included: UserRef | null | undefined,
  usersById: Map<string, UserRef>,
): string {
  if (!userId) return "Sistema";
  const user = included ?? usersById.get(userId);
  if (!user) return "Usuário removido";
  const name = user.name?.trim();
  return name || user.email || "Usuário removido";
}

export async function listAuditLogs(page: number, pageSize: number) {
  const where = { action: { in: [...CRUD_ACTIONS] } };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const userIds = [...new Set(rows.map((row) => row.userId).filter((id): id is string => Boolean(id)))];
  const usersById = new Map<string, UserRef>();

  if (userIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    for (const user of users) {
      usersById.set(user.id, { name: user.name, email: user.email });
    }
  }

  const budgetItemIds = [
    ...new Set(
      rows
        .filter((row) => row.entity === "actual")
        .flatMap((row) => {
          const snapshot = asRecord(row.afterJson) ?? asRecord(row.beforeJson);
          const id = snapshot?.budgetItemId;
          return typeof id === "string" ? [id] : [];
        }),
    ),
  ];

  const budgetItemsById = new Map<string, string>();
  if (budgetItemIds.length > 0) {
    const items = await prisma.budgetItem.findMany({
      where: { id: { in: budgetItemIds } },
      select: { id: true, code: true, name: true },
    });
    for (const item of items) {
      budgetItemsById.set(item.id, item.code ? `${item.code} — ${item.name}` : item.name);
    }
  }

  return {
    rows: rows.map((row) => {
      const snapshot = asRecord(row.afterJson) ?? asRecord(row.beforeJson);
      const budgetItemId = typeof snapshot?.budgetItemId === "string" ? snapshot.budgetItemId : undefined;

      return {
        ...row,
        actorName: resolveActorName(row.userId, row.user, usersById),
        description: buildAuditDescription(
          {
            entity: row.entity,
            action: row.action,
            beforeJson: row.beforeJson,
            afterJson: row.afterJson,
            entityId: row.entityId,
          },
          {
            budgetItemCode: budgetItemId ? budgetItemsById.get(budgetItemId) : undefined,
          },
        ),
      };
    }),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
