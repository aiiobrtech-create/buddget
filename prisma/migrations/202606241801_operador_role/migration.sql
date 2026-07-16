-- Papel Operador e permissões básicas de leitura/operação
INSERT INTO roles (id, code, name, description, created_at, updated_at)
SELECT gen_random_uuid(), 'OPERADOR', 'Operador', 'Operação com escopo restrito por cadastros mestres', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'OPERADOR');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'OPERADOR'
  AND p.code IN (
    'DASHBOARD_READ',
    'BUDGETS_READ',
    'BUDGET_LINES_READ',
    'ACTUALS_READ',
    'ACTUALS_WRITE',
    'REPORTS_READ',
    'COMPANIES_READ',
    'COST_CENTERS_READ',
    'BUDGET_ITEMS_READ'
  )
ON CONFLICT DO NOTHING;
