import { env } from "../../config/env";

export function accessTokenExpiresAtMs(): number {
  const raw = env.JWT_ACCESS_EXPIRES_IN;
  const match = raw.match(/^(\d+)([smhd])$/i);
  if (!match) return Date.now() + 15 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const mult = unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return Date.now() + amount * mult;
}
