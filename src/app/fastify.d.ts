import "@fastify/jwt";
import "fastify";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
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
    user: {
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
  }
}
