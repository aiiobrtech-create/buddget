import { z } from "zod";

export const createCostCenterSchema = z.object({
  categoryId: z.string().uuid(),
  companyId: z.string().uuid().optional(),
  code: z.string().min(1),
  name: z.string().min(2),
  managerUserId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE")
});

export const updateCostCenterSchema = createCostCenterSchema.partial();
