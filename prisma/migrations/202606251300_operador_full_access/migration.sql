UPDATE roles
SET name = 'Operador',
    description = 'Acesso total, exceto gestão de usuários e auditoria'
WHERE code = 'OPERADOR';

DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE code = 'OPERADOR' LIMIT 1);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'OPERADOR'
  AND p.code NOT IN ('USERS_READ', 'USERS_WRITE', 'AUDIT_READ')
ON CONFLICT DO NOTHING;
