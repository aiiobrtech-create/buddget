import { FastifyRequest } from "fastify";
import { ForbiddenError } from "../errors/app-error";

type ScopeInput = {
  companyId?: string;
  costCenterId?: string;
};

function canAccessScope(request: FastifyRequest, scope?: ScopeInput): boolean {
  if (!scope?.companyId) {
    return true;
  }

  const roleCode = request.user.roleCode;
  if (roleCode === "ADMIN") {
    return true;
  }

  if (request.user.companyId && request.user.companyId !== scope.companyId) {
    return false;
  }

  return true;
}

export function ensurePermission(permissionCode: string, scope?: ScopeInput) {
  return async (request: FastifyRequest) => {
    if (request.user.roleCode === "ADMIN") {
      return;
    }

    if (!request.user.permissions.includes(permissionCode)) {
      throw new ForbiddenError(`Permission ${permissionCode} is required`);
    }

    if (!canAccessScope(request, scope)) {
      throw new ForbiddenError("User cannot access this scope");
    }
  };
}

