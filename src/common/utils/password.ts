import bcrypt from "bcryptjs";
import { env } from "../../config/env";

export async function hashPassword(raw: string): Promise<string> {
  return bcrypt.hash(raw, env.BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(raw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(raw, hash);
}
