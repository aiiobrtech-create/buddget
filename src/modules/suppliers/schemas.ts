import { z } from "zod";

export const createSupplierSchema = z.object({
  legalName: z.string().min(2),
  tradeName: z.string().optional(),
  document: z.string().min(5),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE")
});

export const updateSupplierSchema = createSupplierSchema.partial();
