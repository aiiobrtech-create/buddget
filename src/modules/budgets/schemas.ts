import { z } from "zod";

export const createBudgetSchema = z.object({
  companyId: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  name: z.string().min(2),
  description: z.string().optional(),
  currency: z.string().default("BRL")
});

export const createVersionSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["ORIGINAL", "REVISION", "FORECAST"]).default("REVISION"),
  baseVersionId: z.string().uuid().optional()
});
