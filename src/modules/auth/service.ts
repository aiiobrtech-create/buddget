import { createHash } from "crypto";
import type { JWT, SignPayloadType } from "@fastify/jwt";
import { FastifyInstance, FastifyRequest } from "fastify";
import { add } from "date-fns";
import { prisma } from "../../config/prisma";
import { UnauthorizedError } from "../../common/errors/app-error";
import { verifyPassword } from "../../common/utils/password";
import { writeAuditLog } from "../audit-logs/service";
import { getUserAccess } from "../users/access-scopes";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** @fastify/jwt com `namespace: "refreshJwt"` aninha o segundo signer em `app.jwt.refreshJwt`. */
function refreshJwt(app: FastifyInstance): JWT {
  return (app.jwt as JWT & { refreshJwt: JWT }).refreshJwt;
}

type AuthTokenPayload = SignPayloadType & {
  sub: string;
  user_id: string;
  role_code: string;
  roleCode: string;
  company_id: string | null;
  companyId: string | null;
  permissions: string[];
  cost_center_ids: string[];
  costCenterIds: string[];
  sessionId: string;
  type: "access" | "refresh";
};

async function buildUserAuthPayload(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      }
    }
  });

  if (!user || user.status !== "ACTIVE" || user.deletedAt) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const managedCostCenters = await prisma.costCenter.findMany({
    where: { managerUserId: user.id },
    select: { id: true }
  });

  const access = await getUserAccess(user.id);
  const costCenterIds = [...new Set([...managedCostCenters.map((cc) => cc.id), ...access.costCenterIds])];

  return {
    user,
    permissions: user.role.permissions.map((rp) => rp.permission.code),
    costCenterIds,
    access,
  };
}

function buildTokenPayload(input: {
  userId: string;
  roleCode: string;
  companyId: string | null;
  permissions: string[];
  costCenterIds: string[];
  sessionId: string;
  type: "access" | "refresh";
}): AuthTokenPayload {
  return {
    sub: input.userId,
    user_id: input.userId,
    role_code: input.roleCode,
    roleCode: input.roleCode,
    company_id: input.companyId,
    companyId: input.companyId,
    permissions: input.permissions,
    cost_center_ids: input.costCenterIds,
    costCenterIds: input.costCenterIds,
    sessionId: input.sessionId,
    type: input.type
  };
}

export async function login(app: FastifyInstance, request: FastifyRequest, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const found = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!found) {
    throw new UnauthorizedError("E-mail ou senha inválidos");
  }

  const validPassword = await verifyPassword(password, found.passwordHash);
  if (!validPassword) {
    throw new UnauthorizedError("E-mail ou senha inválidos");
  }

  if (found.status !== "ACTIVE" || found.deletedAt) {
    throw new UnauthorizedError("Usuário inativo. Contate o administrador.");
  }

  const { user, permissions, costCenterIds, access } = await buildUserAuthPayload(found.id);
  const session = await prisma.authSession.create({
    data: {
      userId: user.id,
      refreshTokenHash: "pending",
      expiresAt: add(new Date(), { days: 7 })
    }
  });

  const accessToken = await app.jwt.sign(
    buildTokenPayload({
      userId: user.id,
      roleCode: user.role.code,
      companyId: user.companyId,
      permissions,
      costCenterIds,
      sessionId: session.id,
      type: "access"
    })
  );

  const refreshToken = await refreshJwt(app).sign(
    buildTokenPayload({
      userId: user.id,
      roleCode: user.role.code,
      companyId: user.companyId,
      permissions,
      costCenterIds,
      sessionId: session.id,
      type: "refresh"
    })
  );

  await prisma.authSession.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: tokenHash(refreshToken)
    }
  });

  await writeAuditLog({
    module: "auth",
    entity: "session",
    entityId: session.id,
    action: "login",
    userId: user.id,
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"]
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roleCode: user.role.code,
      allowResumo: user.allowResumo,
      access,
    },
  };
}

export async function refresh(app: FastifyInstance, request: FastifyRequest, refreshToken: string) {
  let payload: AuthTokenPayload;

  try {
    payload = refreshJwt(app).verify(refreshToken) as AuthTokenPayload;
  } catch {
    throw new UnauthorizedError("Invalid refresh token");
  }

  if (!payload || payload.type !== "refresh") {
    throw new UnauthorizedError("Invalid refresh token payload");
  }

  const session = await prisma.authSession.findUnique({ where: { id: payload.sessionId } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new UnauthorizedError("Session expired or revoked");
  }

  if (session.refreshTokenHash !== tokenHash(refreshToken)) {
    throw new UnauthorizedError("Refresh token mismatch");
  }

  const { user, permissions, costCenterIds } = await buildUserAuthPayload(payload.sub);

  const newAccessToken = await app.jwt.sign(
    buildTokenPayload({
      userId: user.id,
      roleCode: user.role.code,
      companyId: user.companyId,
      permissions,
      costCenterIds,
      sessionId: session.id,
      type: "access"
    })
  );

  const newRefreshToken = await refreshJwt(app).sign(
    buildTokenPayload({
      userId: user.id,
      roleCode: user.role.code,
      companyId: user.companyId,
      permissions,
      costCenterIds,
      sessionId: session.id,
      type: "refresh"
    })
  );

  await prisma.authSession.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: tokenHash(newRefreshToken),
      expiresAt: add(new Date(), { days: 7 })
    }
  });

  await writeAuditLog({
    module: "auth",
    entity: "session",
    entityId: session.id,
    action: "refresh",
    userId: user.id,
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"]
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roleCode: user.role.code,
    },
  };
}

export async function logout(request: FastifyRequest) {
  const sessionId = request.user.sessionId;

  await prisma.authSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() }
  });

  await writeAuditLog({
    module: "auth",
    entity: "session",
    entityId: sessionId,
    action: "logout",
    userId: request.user.sub,
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"]
  });
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      timezone: true,
      companyId: true,
      allowResumo: true,
      role: {
        select: {
          code: true,
          name: true
        }
      }
    }
  });
  if (!user) return null;
  const access = await getUserAccess(userId);
  return {
    ...user,
    access,
  };
}
