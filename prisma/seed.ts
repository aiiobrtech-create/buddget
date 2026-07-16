import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/common/utils/password";

const prisma = new PrismaClient();

const permissions = [
  ["AUTH_LOGIN", "Auth login", "auth", "login"],
  ["AUTH_REFRESH", "Auth refresh", "auth", "refresh"],
  ["USERS_READ", "Read users", "users", "read"],
  ["USERS_WRITE", "Write users", "users", "write"],
  ["COMPANIES_READ", "Read companies", "companies", "read"],
  ["COMPANIES_WRITE", "Write companies", "companies", "write"],
  ["COST_CENTERS_READ", "Read cost centers", "cost-centers", "read"],
  ["COST_CENTERS_WRITE", "Write cost centers", "cost-centers", "write"],
  ["BUDGET_ITEMS_READ", "Read budget items", "budget-items", "read"],
  ["BUDGET_ITEMS_WRITE", "Write budget items", "budget-items", "write"],
  ["BUDGETS_READ", "Read budgets", "budgets", "read"],
  ["BUDGETS_WRITE", "Write budgets", "budgets", "write"],
  ["BUDGETS_PUBLISH", "Publish budgets", "budget-versions", "publish"],
  ["BUDGET_LINES_READ", "Read budget lines", "budget-lines", "read"],
  ["BUDGET_LINES_WRITE", "Write budget lines", "budget-lines", "write"],
  ["ACTUALS_READ", "Read actuals", "actuals", "read"],
  ["ACTUALS_WRITE", "Write actuals", "actuals", "write"],
  ["FORECASTS_READ", "Read forecasts", "forecasts", "read"],
  ["FORECASTS_WRITE", "Write forecasts", "forecasts", "write"],
  ["REQUESTS_READ", "Read budget requests", "budget-requests", "read"],
  ["REQUESTS_WRITE", "Write budget requests", "budget-requests", "write"],
  ["REQUESTS_APPROVE", "Approve requests", "budget-requests", "approve"],
  ["TRANSFERS_READ", "Read transfers", "transfers", "read"],
  ["TRANSFERS_WRITE", "Write transfers", "transfers", "write"],
  ["IMPORTS_RUN", "Run imports", "imports", "write"],
  ["EXPORTS_RUN", "Run exports", "exports", "write"],
  ["REPORTS_READ", "Read reports", "reports", "read"],
  ["DASHBOARD_READ", "Read dashboard", "dashboard", "read"],
  ["AUDIT_READ", "Read audit logs", "audit-logs", "read"],
] as const;

const operadorDeniedPermissionCodes = new Set(["USERS_READ", "USERS_WRITE", "AUDIT_READ"]);

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { code: "ADMIN" },
    update: {},
    create: { code: "ADMIN", name: "Administrador", description: "Acesso total" },
  });

  const operadorRole = await prisma.role.upsert({
    where: { code: "OPERADOR" },
    update: { name: "Operador", description: "Acesso total, exceto gestão de usuários e auditoria" },
    create: { code: "OPERADOR", name: "Operador", description: "Acesso total, exceto gestão de usuários e auditoria" },
  });

  const consultaRole = await prisma.role.upsert({
    where: { code: "CONSULTA" },
    update: { name: "Consulta", description: "Somente visualização" },
    create: { code: "CONSULTA", name: "Consulta", description: "Somente visualização" },
  });

  const consultaPermissionCodes = [
    "AUTH_LOGIN",
    "AUTH_REFRESH",
    "DASHBOARD_READ",
    "BUDGETS_READ",
    "BUDGET_LINES_READ",
    "ACTUALS_READ",
    "REPORTS_READ",
    "COMPANIES_READ",
    "COST_CENTERS_READ",
    "BUDGET_ITEMS_READ",
    "FORECASTS_READ",
    "TRANSFERS_READ",
    "REQUESTS_READ",
  ] as const;

  for (const [code, name, module, action] of permissions) {
    await prisma.permission.upsert({
      where: { code },
      update: { name, module, action },
      create: { code, name, module, action },
    });
  }

  const permissionRows = await prisma.permission.findMany();

  await prisma.rolePermission.deleteMany({ where: { roleId: operadorRole.id } });

  for (const permission of permissionRows) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });

    if (!operadorDeniedPermissionCodes.has(permission.code)) {
      await prisma.rolePermission.create({
        data: { roleId: operadorRole.id, permissionId: permission.id },
      });
    }

    if (consultaPermissionCodes.includes(permission.code as (typeof consultaPermissionCodes)[number])) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: consultaRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: consultaRole.id, permissionId: permission.id },
      });
    }
  }

  const group = await prisma.companyGroup.upsert({
    where: { code: "1" },
    update: {},
    create: {
      code: "1",
      name: "Grupo Alfa",
      description: "Holding e subsidiárias do conglomerado Alfa",
    },
  });

  const company = await prisma.company.upsert({
    where: { code: "1" },
    update: {},
    create: {
      code: "1",
      name: "Holding Alfa",
      legalName: "Holding Alfa LTDA",
      cnpj: "12.345.678/0001-90",
      companyGroupId: group.id,
    },
  });

  await prisma.company.upsert({
    where: { code: "2" },
    update: {},
    create: {
      code: "2",
      name: "Subsidiária Beta",
      legalName: "Subsidiária Beta LTDA",
      cnpj: "98.765.432/0001-10",
      companyGroupId: group.id,
    },
  });

  const ledgerClass1 = await prisma.budgetCategory.upsert({
    where: { companyId_code: { companyId: company.id, code: "1" } },
    update: { name: "Despesas operacionais", description: "Despesa" },
    create: {
      companyId: company.id,
      code: "1",
      name: "Despesas operacionais",
      description: "Despesa",
      displayOrder: 1,
    },
  });

  const ledgerClass2 = await prisma.budgetCategory.upsert({
    where: { companyId_code: { companyId: company.id, code: "2" } },
    update: { name: "Despesas com pessoal", description: "Despesa" },
    create: {
      companyId: company.id,
      code: "2",
      name: "Despesas com pessoal",
      description: "Despesa",
      displayOrder: 2,
    },
  });

  const cat1 = await prisma.budgetClass.upsert({
    where: { classId_code: { classId: ledgerClass1.id, code: "1" } },
    update: { name: "Software & SaaS" },
    create: { classId: ledgerClass1.id, code: "1", name: "Software & SaaS", displayOrder: 1 },
  });

  await prisma.budgetClass.upsert({
    where: { classId_code: { classId: ledgerClass1.id, code: "2" } },
    update: { name: "Manutenção" },
    create: { classId: ledgerClass1.id, code: "2", name: "Manutenção", displayOrder: 2 },
  });

  const cat3 = await prisma.budgetClass.upsert({
    where: { classId_code: { classId: ledgerClass2.id, code: "3" } },
    update: { name: "Consultorias" },
    create: { classId: ledgerClass2.id, code: "3", name: "Consultorias", displayOrder: 1 },
  });

  for (const cls of [cat1, cat3]) {
    await prisma.budgetNature.upsert({
      where: { classId_code: { classId: cls.id, code: "1" } },
      update: { name: "Padrão" },
      create: { classId: cls.id, code: "1", name: "Padrão", displayOrder: 1 },
    });
  }

  const costCenters = [
    ["1", "Diretoria", cat1.id],
    ["2", "Tecnologia", cat1.id],
    ["3", "Recursos Humanos", cat3.id],
    ["4", "Operações", cat3.id],
  ] as const;

  for (const [code, name, categoryId] of costCenters) {
    const existing = await prisma.costCenter.findFirst({ where: { categoryId, code } });
    if (existing) {
      await prisma.costCenter.update({ where: { id: existing.id }, data: { name, companyId: company.id } });
    } else {
      await prisma.costCenter.create({ data: { companyId: company.id, categoryId, code, name } });
    }
  }

  const passwordHash = await hashPassword("Admin@123456");

  await prisma.user.upsert({
    where: { email: "admin@buddget.local" },
    update: { passwordHash },
    create: {
      name: "BUDDGET Admin",
      email: "admin@buddget.local",
      passwordHash,
      roleId: adminRole.id,
      companyId: company.id,
      timezone: "America/Sao_Paulo",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
