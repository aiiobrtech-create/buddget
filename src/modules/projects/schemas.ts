import { z } from "zod";

export const createProjectSchema = z.object({
  companyId: z.string().uuid(),
  costCenterId: z.string().uuid().optional(),
  code: z.string().min(1),
  name: z.string().min(2),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional()
});

export const updateProjectSchema = createProjectSchema.partial();
