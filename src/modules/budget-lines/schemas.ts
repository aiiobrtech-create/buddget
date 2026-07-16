import { z } from "zod";

export const createBudgetLineSchema = z.object({
  versionId: z.string().uuid(),
  companyId: z.string().uuid(),
  costCenterId: z.string().uuid(),
  categoryId: z.string().uuid(),
  classId: z.string().uuid(),
  natureId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  referenceMonth: z.number().int().min(1).max(12),
  plannedAmount: z.number().finite(),
  notes: z.string().optional()
});

export const updateBudgetLineSchema = createBudgetLineSchema.partial();
