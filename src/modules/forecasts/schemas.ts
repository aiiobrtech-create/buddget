import { z } from "zod";

export const createForecastSchema = z.object({
  budgetId: z.string().uuid(),
  versionId: z.string().uuid(),
  referenceMonth: z.number().int().min(1).max(12),
  forecastAmount: z.number().finite(),
  methodology: z.string().min(3),
  calculationMemory: z.record(z.any()).optional()
});

export const updateForecastSchema = createForecastSchema.partial();
