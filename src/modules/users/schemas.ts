import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(10).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
  companyId: z.string().uuid().optional(),
  roleId: z.string().uuid(),
  timezone: z.string().default("America/Sao_Paulo")
});

export const updateUserSchema = createUserSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional()
});
