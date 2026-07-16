import { z } from "zod";

export const createActualSchema = z.object({
  companyId: z.string().uuid(),
  launchDate: z.string().datetime(),
  competenceDate: z.string().datetime(),
  costCenterId: z.string().uuid(),
  categoryId: z.string().uuid(),
  classId: z.string().uuid(),
  natureId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  documentNumber: z.string().optional(),
  description: z.string().min(2),
  amount: z.number().finite(),
  source: z.enum(["MANUAL", "IMPORT", "INTEGRATION"]).default("MANUAL"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  importBatchId: z.string().uuid().optional()
});

export const updateActualSchema = createActualSchema.partial();
