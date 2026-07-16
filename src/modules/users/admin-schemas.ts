import { z } from "zod";

const accessSchema = z.object({
  companyGroupIds: z.array(z.string().uuid()).default([]),
  companyIds: z.array(z.string().uuid()).default([]),
  classIds: z.array(z.string().uuid()).default([]),
  categoryIds: z.array(z.string().uuid()).default([]),
  costCenterIds: z.array(z.string().uuid()).default([]),
  budgetItemIds: z.array(z.string().uuid()).default([]),
});

export const createAdminUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(10).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
  role: z.string().min(2),
  active: z.boolean().optional(),
  access: accessSchema.optional(),
  allowResumo: z.boolean().optional(),
});

export const updateAdminUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(10).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/).optional(),
  role: z.string().min(2).optional(),
  active: z.boolean().optional(),
  access: accessSchema.optional(),
  allowResumo: z.boolean().optional(),
});
