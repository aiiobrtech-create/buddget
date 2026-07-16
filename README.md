# BUDDGET

App corporativo de controle orçamentário (API Fastify + frontend React/Vite), unificado na porta **4072**, com Postgres via Supabase.

> **Autenticação:** o login é JWT próprio na API (`public.users`). Não usa o Authentication do painel Supabase.

## Setup rápido (clone)

```bash
git clone <url-do-repositorio>
cd BUDDGET
cp .env.example .env
cp frontend/.env.example frontend/.env
npm install
npm --prefix frontend install
# Preencha DATABASE_URL, DIRECT_URL, JWT_* e SUPABASE_* no .env
npm run prisma:generate
npm run db:setup
npm run dev
```

Abra `http://localhost:4072/`. Swagger: `http://localhost:4072/docs`.

Credenciais seed: `admin@buddget.local` / `Admin@123456`

## Publicar no GitHub (somente código)

Não inclui deploy. Exemplo local:

```bash
git init
git add .
git status   # confira: .env NÃO deve aparecer
git commit -m "Initial commit: BUDDGET API + frontend"
gh repo create BUDDGET --private --source=. --remote=origin
git push -u origin HEAD
```

Use repositório **privado** se houver dados internos no histórico. Nunca versionar `.env`.

## Stack
- Node.js + TypeScript
- Fastify (API REST)
- Prisma ORM
- Supabase Postgres (persistencia principal)
- Supabase Storage (imports/exports/attachments)
- JWT access + refresh com rotacao
- Swagger/OpenAPI
- Docker + Docker Compose
- Vitest (unit e integration)

## Arquitetura
- `src/main`: bootstrap
- `src/app`: build do app, registro de rotas
- `src/config`: env e Prisma
- `src/common`: erros, middlewares, respostas padronizadas
- `src/modules`: modulos de dominio e casos de uso
- `src/integrations/supabase`: clientes e storage
- `prisma`: schema, migrations e seed
- `tests`: unitarios e integracao

### Principios
- Regra critica centralizada no backend
- Frontend nao define regra de negocio
- Persistencia principal em Supabase Postgres
- Upload/download seguro via Supabase Storage com URL assinada
- Modelo pronto para evolucao com RLS no futuro

## Modelagem
Schema completo no arquivo `prisma/schema.prisma` com:
- UUID em todas as entidades principais
- enums de status e fluxo
- constraints e indices
- unique logico de `budget_lines`
- soft delete para `users` (`deleted_at`)

Entidades principais implementadas:
- users, roles, permissions, role_permissions, auth_sessions
- companies, cost_centers, budget_categories, budget_classes, budget_natures
- projects, suppliers
- budgets, budget_versions, budget_lines
- actuals, forecasts
- budget_requests, transfers
- import_batches, export_jobs
- audit_logs, file_attachments

## Autenticacao e autorizacao
Estratégia implementada: JWT proprio com usuarios no Supabase Postgres.

Fluxo:
1. `POST /auth/login`: valida credenciais, cria sessao, retorna access e refresh
2. `POST /auth/refresh`: valida refresh, rotaciona token e atualiza hash da sessao
3. `POST /auth/logout`: revoga sessao
4. `GET /me`: retorna usuario autenticado

Controle de acesso:
- middleware de autenticacao (`requireAuth`)
- middleware de autorizacao por permissao (`ensurePermission`)
- escopo por empresa (base pronto para expandir por centro de custo)

## Regras de negocio criticas
### Orcamentos e versoes
- criacao de orcamento anual
- criacao de versoes (original/revision/forecast)
- duplicacao de versao base
- publicacao bloqueada se:
  - versao nao for draft
  - versao sem linhas
  - mes fora de 1..12
  - valor negativo
  - duplicidade logica detectada
- ao publicar:
  - arquiva versoes publicadas anteriores do mesmo budget
  - promove versao para `PUBLISHED`
  - atualiza `budgets.active_version_id`

### Realizados
- lancamento manual com classificacao obrigatoria
- importacao em lote CSV/XLSX
- rastreio de origem (`MANUAL|IMPORT|INTEGRATION`)

### Solicitações
- cria requisicao (`PENDING`)
- aprova/rejeita/cancela com auditoria
- impede transicao quando nao estiver `PENDING`

### Transferencias
- valida origem/destino
- exige mesma versao
- bloqueia quando origem insuficiente
- aplica decremento/incremento atomico em transacao

### Auditoria
Registra eventos de:
- login
- refresh
- logout
- create/update
- publish
- import
- approve/reject/cancel

## Importacao e exportacao
### Importacao
- upload por multipart
- armazenamento no bucket de imports
- parse CSV/XLSX
- validacao por linha
- modo preview (`?preview=true`)
- gravacao de batch (`import_batches`)
- relatorio de erro em storage (`errors/<batch>.txt`)

Importacoes implementadas:
- `POST /budget-lines/import`
- `POST /actuals/import`
- `POST /imports/master?type=suppliers|projects|cost-centers`

### Exportacao
- geracao CSV/XLSX/PDF
- registro de job em `export_jobs`
- upload no bucket de exports
- retorno de URL assinada

Endpoint:
- `GET /reports/dashboard-export?format=csv|xlsx|pdf`

## Dashboard e relatórios
- `GET /dashboard/summary`
- `GET /dashboard/monthly`
- `GET /dashboard/by-category`
- `GET /dashboard/top-deviations`
- `GET /dashboard/by-cost-center`
- `GET /reports/budget-vs-actual`

## Endpoints
Autenticacao:
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /me`

Identidade e acesso:
- `GET /users`
- `POST /users`
- `PATCH /users/:id`
- `GET /roles`
- `GET /permissions`

Cadastros:
- `GET /companies`
- `POST /companies`
- `GET /cost-centers`
- `POST /cost-centers`
- `GET /categories`
- `GET /classes`
- `GET /natures`
- `GET /projects`
- `GET /suppliers`

Orcamento:
- `GET /budgets`
- `POST /budgets`
- `GET /budgets/:id`
- `POST /budgets/:id/versions`
- `POST /budget-versions/:id/duplicate`
- `POST /budget-versions/:id/publish`
- `GET /budget-lines`
- `POST /budget-lines`
- `POST /budget-lines/import`

Realizado e forecast:
- `GET /actuals`
- `POST /actuals`
- `POST /actuals/import`
- `GET /forecasts`
- `POST /forecasts`

Solicitacoes e transferencias:
- `GET /budget-requests`
- `POST /budget-requests`
- `POST /budget-requests/:id/approve`
- `POST /budget-requests/:id/reject`
- `POST /budget-requests/:id/cancel`
- `GET /transfers`
- `POST /transfers`

Analytics:
- `GET /reports/budget-vs-actual`
- `GET /reports/dashboard-export`
- `GET /dashboard/summary`
- `GET /dashboard/monthly`
- `GET /dashboard/by-category`
- `GET /dashboard/top-deviations`
- `GET /dashboard/by-cost-center`

Governanca:
- `GET /audit-logs`

## Padrao de resposta
Sucesso:
```json
{
  "data": {},
  "meta": {}
}
```

Paginado:
```json
{
  "data": [],
  "pagination": { "page": 1, "pageSize": 20, "total": 100, "totalPages": 5 },
  "meta": {}
}
```

Erro:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": {}
  }
}
```

## Variaveis de ambiente
Veja `.env.example`:

**Postgres via Supabase (recomendado)**  
Se `SUPABASE_URL` for `*.supabase.co`, o backend exige que `DATABASE_URL` e `DIRECT_URL` apontem para o **mesmo projeto** (host `*.supabase.co` ou `*.pooler.supabase.com`), não para `localhost`.  
No painel: **Project Settings → Database → Connection string**: use **Transaction** (com `?pgbouncer=true`) em `DATABASE_URL` e **Session** ou URI **Direct** em `DIRECT_URL` para o Prisma (`directUrl`). Se usar só a URI direta `db.<ref>.supabase.co:5432` em ambas, não use pooler em `DATABASE_URL`.

A validação em `src/config/env.ts` impede `DATABASE_URL` local com `SUPABASE_URL` de cloud.

- PORT
- NODE_ENV
- DATABASE_URL
- DIRECT_URL
- JWT_SECRET
- JWT_REFRESH_SECRET
- JWT_ACCESS_EXPIRES_IN
- JWT_REFRESH_EXPIRES_IN
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_STORAGE_BUCKET_IMPORTS
- SUPABASE_STORAGE_BUCKET_EXPORTS
- SUPABASE_STORAGE_BUCKET_ATTACHMENTS
- BCRYPT_SALT_ROUNDS

Os buckets padrão no `.env.example` são `buddget-imports`, `buddget-exports`, `buddget-attachments`. Crie-os no Supabase **Storage** (ou ajuste os nomes no `.env` para buckets que já existam).

## Setup local
1. Copiar `.env.example` para `.env` e ajustar valores
2. Instalar dependencias:
```bash
npm install
```
3. Gerar client Prisma:
```bash
npm run prisma:generate
```
4. Aplicar migrations:
```bash
npm run prisma:dev
```
5. Seed inicial:
```bash
npm run prisma:seed
```
6. Rodar o app unificado (API + frontend na porta **4072**):
```bash
npm run dev
```

Abra **`http://localhost:4072/`**. Swagger: **`http://localhost:4072/docs`**.

`npm run dev:app` é um alias para o mesmo comando.

## Docker
```bash
docker compose up --build
```

## Testes
```bash
npm test
```

## Credenciais seed
- email: `admin@buddget.local`
- senha: `Admin@123456`

## Observacoes de producao
- Use sempre `SUPABASE_SERVICE_ROLE_KEY` apenas no backend
- Configure rotacao e expiração de JWT de acordo com compliance
- Ative monitoramento e observabilidade (APM, tracing, log centralizado)
- Revisar SQL bruto em dashboard para parametrizacao total ao adicionar filtros dinamicos

## Endpoints CRUD adicionais (alteracao/exclusao)
- `PATCH /users/:id`
- `DELETE /users/:id`
- `PATCH /companies/:id`
- `DELETE /companies/:id`
- `PATCH /cost-centers/:id`
- `DELETE /cost-centers/:id`
- `POST /projects`
- `PATCH /projects/:id`
- `DELETE /projects/:id`
- `POST /suppliers`
- `PATCH /suppliers/:id`
- `DELETE /suppliers/:id`
- `PATCH /budget-lines/:id`
- `DELETE /budget-lines/:id`
- `PATCH /actuals/:id`
- `DELETE /actuals/:id`
- `PATCH /forecasts/:id`
- `DELETE /forecasts/:id`

## Contrato de Claims JWT (RLS)
Tokens `access` e `refresh` emitidos pelo backend carregam estes campos para compatibilidade com API e políticas RLS no Supabase:

- `sub`: UUID do usuário
- `user_id`: UUID do usuário (snake_case para RLS)
- `role_code`: código do perfil (`ADMIN`, `CONTROLLER`, etc.)
- `roleCode`: alias camelCase
- `company_id`: UUID da empresa do usuário (ou `null`)
- `companyId`: alias camelCase
- `permissions`: lista de permissões efetivas
- `cost_center_ids`: lista de centros de custo gerenciados pelo usuário
- `costCenterIds`: alias camelCase
- `sessionId`: UUID da sessão de autenticação
- `type`: `access` ou `refresh`

Exemplo simplificado:

```json
{
  "sub": "864aeb07-2575-484f-8f2e-9e6961b4f856",
  "user_id": "864aeb07-2575-484f-8f2e-9e6961b4f856",
  "role_code": "CONTROLLER",
  "company_id": "9d64af10-576a-42b7-b756-a2209c2f6f23",
  "permissions": ["BUDGETS_READ", "BUDGETS_WRITE"],
  "cost_center_ids": ["f8c2...", "e7a1..."],
  "sessionId": "1f29...",
  "type": "access"
}
```
