import { z } from "zod";

export const createTransferSchema = z.object({
  sourceBudgetLineId: z.string().uuid(),
  targetBudgetLineId: z.string().uuid(),
  amount: z.number().positive(),
  justification: z.string().min(5)
});
