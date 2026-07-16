import { z } from "zod";

export const createBudgetRequestSchema = z.object({
  type: z.enum(["REINFORCEMENT", "TRANSFER", "CREATION", "ADJUSTMENT"]),
  companyId: z.string().uuid(),
  costCenterId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  natureId: z.string().uuid().optional(),
  requestedAmount: z.number().positive(),
  justification: z.string().min(5),
  priority: z.string().min(1)
});

export const reviewBudgetRequestSchema = z.object({
  notes: z.string().optional()
});
