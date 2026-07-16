import { createBrowserRouter } from 'react-router-dom'
import { RequireAuth } from './RequireAuth'
import { AppShellLayout } from '@/layouts/AppShellLayout'
import { AccessGate } from '@/layouts/AccessGate'
import { LoginPage } from '@/pages/login/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { ResumoPage } from '@/pages/resumo/ResumoPage'
import { BudgetPlanningPage } from '@/pages/planning/BudgetPlanningPage'
import { BudgetsPage } from '@/pages/budgets/BudgetsPage'
import { ActualsPage } from '@/pages/actuals/ActualsPage'
import { ActualDetailPage } from '@/pages/actuals/ActualDetailPage'
import { ActualImportPage } from '@/pages/actuals/ActualImportPage'
import { ComparativePage } from '@/pages/comparative/ComparativePage'
import { ForecastPage } from '@/pages/forecast/ForecastPage'
import { ItemsPage } from '@/pages/itens/ItemsPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import {
  CategoriesPage,
  ClassesPage,
  CompaniesPage,
  CompanyGroupsPage,
  CostCentersPage,
} from '@/pages/cadastros/registry'
import {
  AdminAuditPage,
  AdminParametersPage,
  AdminPermissionsPage,
  AdminSettingsPage,
  AdminUsersPage,
} from '@/pages/admin/registry'
import { RouteErrorBoundary } from './RouteErrorBoundary'
import { NotFoundPage } from '@/pages/system/NotFoundPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage />, errorElement: <RouteErrorBoundary /> },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <AppShellLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          {
            element: <AccessGate />,
            errorElement: <RouteErrorBoundary />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'resumo', element: <ResumoPage /> },
              { path: 'orcamentos', element: <BudgetsPage /> },
              { path: 'planejamento', element: <BudgetPlanningPage /> },
              { path: 'realizado', element: <ActualsPage /> },
              { path: 'realizado/importacao', element: <ActualImportPage /> },
              { path: 'realizado/:id', element: <ActualDetailPage /> },
              { path: 'comparativo', element: <ComparativePage /> },
              { path: 'forecast', element: <ForecastPage /> },
              { path: 'relatorios', element: <ReportsPage /> },

              { path: 'cadastros/grupos-de-empresas', element: <CompanyGroupsPage /> },
              { path: 'cadastros/empresas', element: <CompaniesPage /> },
              { path: 'cadastros/classes', element: <ClassesPage /> },
              { path: 'cadastros/centros-de-custo', element: <CostCentersPage /> },
              { path: 'cadastros/categorias', element: <CategoriesPage /> },

              { path: 'itens', element: <ItemsPage /> },

              { path: 'admin/usuarios', element: <AdminUsersPage /> },
              { path: 'admin/permissoes', element: <AdminPermissionsPage /> },
              { path: 'admin/parametros', element: <AdminParametersPage /> },
              { path: 'admin/auditoria', element: <AdminAuditPage /> },
              { path: 'admin/configuracoes', element: <AdminSettingsPage /> },

              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
])
