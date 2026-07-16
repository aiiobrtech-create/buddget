export type AuthContext = {
  userId: string;
  roleCode: string;
  companyId: string | null;
  permissions: string[];
};

