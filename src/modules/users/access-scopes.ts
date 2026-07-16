import type { UserScopeType } from "@prisma/client";
import { prisma } from "../../config/prisma";

export type UserAccessPayload = {
  companyGroupIds: string[];
  companyIds: string[];
  classIds: string[];
  categoryIds: string[];
  costCenterIds: string[];
  budgetItemIds: string[];
};

const SCOPE_KEYS: Record<keyof UserAccessPayload, UserScopeType> = {
  companyGroupIds: "COMPANY_GROUP",
  companyIds: "COMPANY",
  classIds: "CLASS",
  categoryIds: "CATEGORY",
  costCenterIds: "COST_CENTER",
  budgetItemIds: "BUDGET_ITEM",
};

export const EMPTY_USER_ACCESS: UserAccessPayload = {
  companyGroupIds: [],
  companyIds: [],
  classIds: [],
  categoryIds: [],
  costCenterIds: [],
  budgetItemIds: [],
};

function uniqueIds(ids: string[] | undefined): string[] {
  if (!ids?.length) return [];
  return [...new Set(ids.filter((id) => id && id !== "all"))];
}

export function groupAccessScopes(
  rows: { scopeType: UserScopeType; scopeId: string }[],
): UserAccessPayload {
  const access = { ...EMPTY_USER_ACCESS };
  for (const row of rows) {
    switch (row.scopeType) {
      case "COMPANY_GROUP":
        access.companyGroupIds.push(row.scopeId);
        break;
      case "COMPANY":
        access.companyIds.push(row.scopeId);
        break;
      case "CLASS":
        access.classIds.push(row.scopeId);
        break;
      case "CATEGORY":
        access.categoryIds.push(row.scopeId);
        break;
      case "COST_CENTER":
        access.costCenterIds.push(row.scopeId);
        break;
      case "BUDGET_ITEM":
        access.budgetItemIds.push(row.scopeId);
        break;
      default:
        break;
    }
  }
  return access;
}

export async function getUserAccess(userId: string): Promise<UserAccessPayload> {
  const rows = await prisma.userAccessScope.findMany({
    where: { userId },
    select: { scopeType: true, scopeId: true },
  });
  return groupAccessScopes(rows);
}

export async function saveUserAccess(userId: string, access?: UserAccessPayload) {
  const payload = access ?? EMPTY_USER_ACCESS;
  const rows = (Object.keys(SCOPE_KEYS) as (keyof UserAccessPayload)[]).flatMap((key) =>
    uniqueIds(payload[key]).map((scopeId) => ({
      userId,
      scopeType: SCOPE_KEYS[key],
      scopeId,
    })),
  );

  await prisma.$transaction([
    prisma.userAccessScope.deleteMany({ where: { userId } }),
    ...(rows.length ? [prisma.userAccessScope.createMany({ data: rows })] : []),
  ]);

  return getUserAccess(userId);
}

export async function getAccessScopesForUsers(userIds: string[]) {
  if (!userIds.length) return new Map<string, UserAccessPayload>();
  const rows = await prisma.userAccessScope.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, scopeType: true, scopeId: true },
  });

  const map = new Map<string, UserAccessPayload>();
  for (const userId of userIds) {
    map.set(
      userId,
      groupAccessScopes(
        rows.filter((r) => r.userId === userId).map(({ scopeType, scopeId }) => ({ scopeType, scopeId })),
      ),
    );
  }
  return map;
}
