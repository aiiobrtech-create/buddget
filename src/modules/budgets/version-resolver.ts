import { prisma } from "../../config/prisma";

export async function resolveBudgetVersionId(input: {
  versionId?: string;
  budgetId?: string;
}): Promise<string | undefined> {
  if (input.versionId) return input.versionId;
  if (!input.budgetId) return undefined;

  const budget = await prisma.budget.findUnique({
    where: { id: input.budgetId },
    include: { versions: { orderBy: { versionNumber: "desc" } } },
  });
  if (!budget) return undefined;

  if (budget.activeVersionId) return budget.activeVersionId;

  const published = budget.versions.find((v) => v.status === "PUBLISHED");
  if (published) return published.id;

  const draft = budget.versions.find((v) => v.status === "DRAFT");
  if (draft) return draft.id;

  return budget.versions[0]?.id;
}
