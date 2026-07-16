import { accessTokenExpiresAtMs } from "../../common/utils/jwt-expiry";
import { mapRoleCode } from "../masters-bridge/mappers";

export function toFrontendAuthResponse(raw: {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string; roleCode: string; allowResumo?: boolean; access?: any };
}) {
  return {
    user: {
      id: raw.user.id,
      email: raw.user.email,
      name: raw.user.name,
      role: mapRoleCode(raw.user.roleCode),
      allowResumo: raw.user.allowResumo,
      access: raw.user.access,
    },
    tokens: {
      accessToken: raw.accessToken,
      refreshToken: raw.refreshToken,
      expiresAt: accessTokenExpiresAtMs(),
    },
  };
}
