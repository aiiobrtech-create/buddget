-- Papel Consulta (somente leitura)
INSERT INTO roles (id, code, name, description, created_at, updated_at)
SELECT gen_random_uuid(), 'CONSULTA', 'Consulta', 'Somente visualização', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'CONSULTA');

UPDATE roles SET name = 'Operador', description = 'Movimentos (realizado) com escopo restrito' WHERE code = 'OPERADOR';

-- Usuários de papéis legados → novos papéis
UPDATE users
SET role_id = (SELECT id FROM roles WHERE code = 'ADMIN' LIMIT 1)
WHERE role_id IN (SELECT id FROM roles WHERE code IN ('CONTROLLER', 'ADMIN'));

UPDATE users
SET role_id = (SELECT id FROM roles WHERE code = 'OPERADOR' LIMIT 1)
WHERE role_id IN (SELECT id FROM roles WHERE code IN ('GESTOR', 'ANALISTA'));

-- Permissões do Operador (somente movimentos)
DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE code = 'OPERADOR' LIMIT 1);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'OPERADOR'
  AND p.code IN (
    'DASHBOARD_READ',
    'ACTUALS_READ',
    'ACTUALS_WRITE',
    'COMPANIES_READ',
    'COST_CENTERS_READ',
    'BUDGET_ITEMS_READ'
  )
ON CONFLICT DO NOTHING;

-- Permissões da Consulta (somente leitura)
DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE code = 'CONSULTA' LIMIT 1);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'CONSULTA'
  AND p.code IN (
    'DASHBOARD_READ',
    'BUDGETS_READ',
    'BUDGET_LINES_READ',
    'ACTUALS_READ',
    'REPORTS_READ',
    'COMPANIES_READ',
    'COST_CENTERS_READ',
    'BUDGET_ITEMS_READ',
    'FORECASTS_READ',
    'TRANSFERS_READ',
    'REQUESTS_READ'
  )
ON CONFLICT DO NOTHING;
