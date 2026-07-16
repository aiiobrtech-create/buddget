import { z } from "zod";

export const createCompanySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(2),
  legalName: z.string().optional(),
  cnpj: z.string().optional(),
  companyGroupId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const updateCompanySchema = createCompanySchema.partial();
