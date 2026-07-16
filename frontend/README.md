# BUDDGET — Frontend

SPA corporativa em **React 19**, **Vite**, **TypeScript**, **Tailwind CSS v4**, **lucide-react**, **motion** e **React Router**, com visual **dark premium** e integração preparada para **API REST** (backend que pode usar **Supabase Postgres** e **Supabase Storage** sem expor regras de negócio no browser).

## Requisitos

- Node.js 20+

## Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste:

| Variável | Descrição |
|----------|-----------|
| `VITE_API_BASE_URL` | URL base da API (padrão: `/api`, mesma origem) |
| `VITE_APP_NAME` | Nome exibido (padrão: `BUDDGET`) |
| `VITE_USE_MOCK_API` | `true` (padrão se omitido): mocks locais. `false`: HTTP real. |
| `VITE_SUPABASE_URL` | Opcional — apenas recursos complementares controlados |
| `VITE_SUPABASE_ANON_KEY` | Opcional — mesmo uso acima |

## Scripts

Na **raiz do monorepo**, use o servidor unificado:

```bash
npm run dev
```

Abra **`http://localhost:4072/`** (API + frontend na mesma porta). Swagger: **`http://localhost:4072/docs`**.

Para build isolado do frontend:

```bash
npm run build
```

## Arquitetura

- **`src/services/api`**: cliente HTTP, envelope `{ data, meta, pagination, error }`, interceptors e fluxo de refresh.
- **`src/services/modules`**: um service por domínio (auth, dashboard, budgets, etc.), com **mock ou API** conforme `VITE_USE_MOCK_API`.
- **`src/mocks`**: fixtures substituíveis.
- **`src/types`**: contratos tipados alinhados a entidades persistidas (ids UUID/string).
- **`src/layouts`**: App shell (sidebar fixa, topbar translúcida, painéis glass).
- **`src/components/ui`**: design system (tabelas, filtros, modais, toasts, etc.).
- **`src/components/charts`**: gráficos Recharts otimizados para dark mode.
- **`src/integrations/supabase-client.ts`**: cliente Supabase **opcional** e dinâmico — não substitui a API.

## Autenticação

Login grava tokens via `tokenStorage` e perfil via `userSession`. Rotas protegidas usam `RequireAuth`; escopo de navegação por perfil (UX) em `modules/auth/permissions.ts` — **autorização real permanece no backend**.

## Contrato de API esperado

Respostas JSON no formato:

```json
{
  "data": { },
  "meta": { },
  "pagination": { "page": 1, "pageSize": 20, "totalItems": 0, "totalPages": 0 }
}
```

Erros:

```json
{ "error": { "code": "string", "message": "string", "details": {} } }
```

## Perfis de UX

`admin`, `operador`, `consulta` — refletem menus e gates de rota no front; o RBAC definitivo é server-side.

---

O servidor de desenvolvimento unificado vive na raiz (`npm run dev`); este diretório contém o código-fonte React servido pelo Fastify via Vite middleware.
