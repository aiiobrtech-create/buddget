import type {
  ActualEntry,
  AuditLogEntry,
  Budget,
  BudgetItem,
  BudgetVersion,
  BudgetVersionDetail,
  Category,
  Company,
  CompanyGroup,
  ComparisonRow,
  CostCenter,
  ForecastRevision,
  IntegrationEndpoint,
  LedgerClass,
  Nature,
  Project,
  RoleProfile,
  SystemParameter,
  UserAccount,
  UserRole,
} from '@/types/entities'
import type { AuthUser } from '@/types/auth'
import type { ExecutiveDashboard } from '@/types/dashboard'
import type { LoginResponse } from '@/types/auth'

export const mockUser: AuthUser = {
  id: 'u1',
  email: 'admin@buddget.local',
  name: 'BUDDGET Admin',
  role: 'admin',
}

export function mockTokens() {
  const now = Date.now()
  return {
    accessToken: 'mock-access',
    refreshToken: 'mock-refresh',
    expiresAt: now + 60 * 60 * 1000,
  }
}

export function mockLoginResponse(role: UserRole = 'admin'): LoginResponse {
  return {
    user: { ...mockUser, role },
    tokens: mockTokens(),
  }
}

export const mockExecutiveDashboard: ExecutiveDashboard = {
  kpis: {
    budgetTotal: 48_250_000,
    actualTotal: 41_180_500,
    varianceValue: -7_069_500,
    variancePct: -14.65,
    availableBalance: 5_420_000,
    committed: 3_980_200,
    forecastTotal: 46_100_000,
  },
  alerts: [
    {
      id: 'a1',
      title: 'Centro 1200 acima do ritmo',
      message: 'Despesa de TI projetada +18% vs orçamento na linha “Cloud”.',
      severity: 'warning',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'a2',
      title: 'Forecast atualizado',
      message: 'Nova previsão de fechamento — comparar com o orçamento anual.',
      severity: 'info',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'a3',
      title: 'Categoria “Marketing” em atenção',
      message: 'Saldo mensal abaixo de 6% — avaliar transferências pendentes.',
      severity: 'critical',
      createdAt: new Date().toISOString(),
    },
  ],
  charts: {
    budgetVsActualByMonth: [
      { key: '01', label: 'Jan', orcado: 3_850_000, realizado: 3_420_000 },
      { key: '02', label: 'Fev', orcado: 3_910_000, realizado: 3_610_000 },
      { key: '03', label: 'Mar', orcado: 4_050_000, realizado: 3_980_000 },
      { key: '04', label: 'Abr', orcado: 4_120_000, realizado: 3_720_000 },
      { key: '05', label: 'Mai', orcado: 4_200_000, realizado: 3_995_000 },
      { key: '06', label: 'Jun', orcado: 4_280_000, realizado: 4_050_500 },
      { key: '07', label: 'Jul', orcado: 4_350_000, realizado: 4_010_000 },
      { key: '08', label: 'Ago', orcado: 4_410_000, realizado: 4_180_000 },
      { key: '09', label: 'Set', orcado: 4_500_000, realizado: 3_905_000 },
      { key: '10', label: 'Out', orcado: 4_620_000, realizado: 3_710_000 },
    ],
    categorySplit: [
      { name: 'Pessoal', value: 32 },
      { name: 'TI & Cloud', value: 18 },
      { name: 'Marketing', value: 12 },
      { name: 'Operações', value: 22 },
      { name: 'Projetos', value: 10 },
      { name: 'Outros', value: 6 },
    ],
    topVariances: [
      { name: 'CC 3000 — Operações Log', variance: -1_280_000, health: 'over' },
      { name: 'CC 1200 — TI', variance: -920_000, health: 'attention' },
      { name: 'CC 2100 — RH', variance: 410_000, health: 'ok' },
      { name: 'CC 4100 — Projetos', variance: -610_000, health: 'attention' },
    ],
    executionByCostCenter: [
      { code: '1000', name: 'Diretoria', executionPct: 0.82 },
      { code: '1200', name: 'Tecnologia', executionPct: 0.91 },
      { code: '2100', name: 'Recursos Humanos', executionPct: 0.74 },
      { code: '3000', name: 'Operações', executionPct: 0.96 },
      { code: '4100', name: 'Projetos Estratégicos', executionPct: 0.88 },
    ],
    forecastTrend: [
      { month: 'Jan', original: 3_850_000, revisao: 3_820_000, forecast: 3_780_000 },
      { month: 'Fev', original: 3_910_000, revisao: 3_940_000, forecast: 3_910_000 },
      { month: 'Mar', original: 4_050_000, revisao: 4_120_000, forecast: 4_080_000 },
      { month: 'Abr', original: 4_120_000, revisao: 4_200_000, forecast: 4_150_000 },
      { month: 'Mai', original: 4_200_000, revisao: 4_260_000, forecast: 4_310_000 },
      { month: 'Jun', original: 4_280_000, revisao: 4_320_000, forecast: 4_360_000 },
    ],
    annualConsolidated: [
      { month: 'Jan', orcadoAcum: 3_850_000, realizadoAcum: 3_420_000 },
      { month: 'Fev', orcadoAcum: 7_760_000, realizadoAcum: 7_030_000 },
      { month: 'Mar', orcadoAcum: 11_810_000, realizadoAcum: 11_010_000 },
      { month: 'Abr', orcadoAcum: 15_930_000, realizadoAcum: 14_730_000 },
      { month: 'Mai', orcadoAcum: 20_130_000, realizadoAcum: 18_725_000 },
      { month: 'Jun', orcadoAcum: 24_410_000, realizadoAcum: 22_775_500 },
      { month: 'Jul', orcadoAcum: 28_760_000, realizadoAcum: 26_785_500 },
      { month: 'Ago', orcadoAcum: 33_170_000, realizadoAcum: 30_965_500 },
      { month: 'Set', orcadoAcum: 37_670_000, realizadoAcum: 34_870_500 },
      { month: 'Out', orcadoAcum: 42_290_000, realizadoAcum: 38_580_500 },
    ],
  },
}

export const mockCompanyGroups: CompanyGroup[] = [
  {
    id: 'cg1',
    code: '1',
    name: 'Grupo Alfa',
    description: 'Holding e subsidiárias do conglomerado Alfa',
    active: true,
    createdAt: '2025-01-01',
  },
]

export const mockCompanies: Company[] = [
  {
    id: 'c1',
    companyGroupId: 'cg1',
    code: '1',
    name: 'Holding Alfa',
    taxId: '12.345.678/0001-90',
    active: true,
    createdAt: '2025-01-10',
  },
  {
    id: 'c2',
    companyGroupId: 'cg1',
    code: '2',
    name: 'Subsidiária Beta',
    taxId: '98.765.432/0001-10',
    active: true,
    createdAt: '2025-02-02',
  },
]

export const mockCostCenters: CostCenter[] = [
  { id: 'cc1', categoryId: 'cat1', code: '1', name: 'Diretoria', active: true },
  { id: 'cc2', categoryId: 'cat1', code: '2', name: 'Tecnologia', active: true },
  { id: 'cc3', categoryId: 'cat2', code: '3', name: 'Recursos Humanos', active: true },
  { id: 'cc4', categoryId: 'cat2', code: '4', name: 'Operações', active: true },
]

export const mockBudgetItems: BudgetItem[] = [
  { id: 'bi1', costCenterId: 'cc1', code: '1', name: 'Padrão', active: true },
  { id: 'bi2', costCenterId: 'cc2', code: '1', name: 'Padrão', active: true },
  { id: 'bi3', costCenterId: 'cc3', code: '1', name: 'Padrão', active: true },
  { id: 'bi4', costCenterId: 'cc4', code: '1', name: 'Padrão', active: true },
]

export const mockBudgets: Budget[] = [
  {
    id: 'b1',
    companyGroupId: 'cg1',
    companyId: 'c1',
    year: 2026,
    name: 'Orçamento operacional 2026',
    currency: 'BRL',
    status: 'draft',
    createdAt: '2026-01-10',
    versions: [
      {
        id: 'v1',
        budgetId: 'b1',
        name: 'Versão original',
        type: 'ORIGINAL',
        versionNumber: 1,
        status: 'published',
        createdAt: '2026-01-12',
        publishedAt: '2026-01-18',
      },
      {
        id: 'v2',
        budgetId: 'b1',
        name: 'Revisão Q2',
        type: 'REVISION',
        versionNumber: 2,
        status: 'draft',
        baseVersionId: 'v1',
        createdAt: '2026-03-02',
      },
    ],
  },
]

function toPlanningVersion(budget: Budget, version: BudgetVersionDetail): BudgetVersion {
  const statusSuffix =
    version.status === 'published' ? ' — Publicado' : version.status === 'draft' ? ' — Rascunho' : ''
  const companyId =
    budget.companyId ?? mockCompanies.find((c) => c.companyGroupId === budget.companyGroupId)?.id ?? ''
  return {
    id: version.id,
    year: budget.year,
    label: `v${budget.year}.${version.versionNumber} — ${version.name}${statusSuffix}`,
    status: version.status,
    companyId,
    createdAt: version.createdAt,
    publishedAt: version.publishedAt,
    budgetId: version.budgetId,
    name: version.name,
    type: version.type,
    versionNumber: version.versionNumber,
  }
}

export const mockBudgetVersions: BudgetVersion[] = mockBudgets.flatMap((budget) =>
  budget.versions.map((version) => toPlanningVersion(budget, version)),
)

export const mockActuals: ActualEntry[] = [
  {
    id: 'act1',
    date: '2026-04-02',
    companyId: 'c1',
    costCenterId: 'cc2',
    categoryId: 'cat1',
    classId: 'cl1',
    projectId: 'p1',
    description: 'Fatura SaaS — workspace corporativo',
    amount: 128_400,
    origin: 'integracao',
    status: 'validado',
    sourceRef: 'SAP-77821',
  },
  {
    id: 'act2',
    date: '2026-04-05',
    companyId: 'c1',
    costCenterId: 'cc4',
    categoryId: 'cat2',
    classId: 'cl1',
    description: 'Manutenção predial — unidade SP',
    amount: 42_900,
    origin: 'manual',
    status: 'pendente',
  },
  {
    id: 'act3',
    date: '2026-03-28',
    companyId: 'c1',
    costCenterId: 'cc1',
    categoryId: 'cat3',
    classId: 'cl2',
    description: 'Consultoria estratégica (parcela 2/4)',
    amount: 210_000,
    origin: 'import',
    status: 'conciliado',
    sourceRef: 'IMP-2026-033',
  },
]

export const mockCategories: Category[] = [
  { id: 'cat1', classId: 'cl1', code: '1', name: 'Software & SaaS', active: true },
  { id: 'cat2', classId: 'cl1', code: '2', name: 'Manutenção', active: true },
  { id: 'cat3', classId: 'cl2', code: '3', name: 'Consultorias', active: true },
]

export const mockClasses: LedgerClass[] = [
  { id: 'cl1', companyId: 'c1', code: '1', name: 'Despesas operacionais', nature: 'Despesa' },
  { id: 'cl2', companyId: 'c1', code: '2', name: 'Despesas com pessoal', nature: 'Despesa' },
]

export const mockNatures: Nature[] = [
  { id: 'n1', code: 'ND', name: 'Despesa' },
  { id: 'n2', code: 'NC', name: 'Custo' },
]

export const mockProjects: Project[] = [
  { id: 'p1', code: 'PRJ-2026-A', name: 'Modernização ERP', active: true },
  { id: 'p2', code: 'PRJ-2026-B', name: 'Expansão CD Sul', active: true },
]



export const mockProfiles: RoleProfile[] = [
  { id: 'rp1', name: 'Administrador', key: 'admin', description: 'Acesso total ao sistema.' },
  { id: 'rp2', name: 'Operador', key: 'operador', description: 'Lançamentos de realizado com escopo restrito.' },
  { id: 'rp3', name: 'Consulta', key: 'consulta', description: 'Visualização sem alterações.' },
]

export const mockUsers: UserAccount[] = [
  {
    id: 'u1',
    email: 'admin@buddget.local',
    name: 'BUDDGET Admin',
    role: 'admin',
    profileId: 'rp1',
    active: true,
    lastLoginAt: new Date().toISOString(),
    allowResumo: true,
  },
  {
    id: 'u2',
    email: 'operador@empresa.com',
    name: 'Operador Exemplo',
    role: 'operador',
    profileId: 'rp2',
    active: true,
    allowResumo: true,
  },
]

export const mockForecastRevisions: Omit<ForecastRevision, 'projection' | 'totals'>[] = [
  {
    id: 'fr1',
    label: 'Forecast Abr/26 — baseline TI',
    baseVersionId: 'v1',
    createdAt: '2026-04-03T11:00:00Z',
    createdBy: 'Marina Almeida',
  },
  {
    id: 'fr2',
    label: 'Forecast Mar/26 — marketing',
    baseVersionId: 'v1',
    createdAt: '2026-03-21T09:30:00Z',
    createdBy: 'Ricardo Nogueira',
  },
]

export const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'al1',
    action: 'create',
    entity: 'budget_item',
    entityId: 'bi1',
    actor: 'Marina Almeida',
    at: '2026-01-18T18:02:00Z',
    description: 'Item orçamentário: 01.02 — Cloud AWS',
  },
  {
    id: 'al2',
    action: 'update',
    entity: 'actual',
    entityId: 'a1',
    actor: 'admin@empresa.com',
    at: '2026-02-02T12:44:00Z',
    description: 'Linha de realizado: 01.02 — Licenças · NF-4421 · R$ 12.500,00',
    metadata: { key: 'default_fiscal_year', value: '2026' },
  },
]

export const mockParameters: SystemParameter[] = [
  { id: 'p1', key: 'default_fiscal_year', value: '2026', description: 'Ano fiscal padrão para novas versões.' },
  { id: 'p2', key: 'variance_warn_pct', value: '5', description: 'Alerta de atenção quando |var%| ≥ valor.' },
]

export const mockIntegrations: IntegrationEndpoint[] = [
  { id: 'i1', name: 'SAP — lançamentos', provider: 'SAP RFC', status: 'ativa', lastSyncAt: '2026-04-09T07:12:00Z' },
  { id: 'i2', name: 'Workbench uploads', provider: 'Supabase Storage', status: 'ativa', lastSyncAt: '2026-04-08T19:40:00Z' },
]

export const mockComparisonTree: ComparisonRow[] = [
  {
    id: 'root',
    label: 'Despesas operacionais',
    level: 0,
    budgeted: 18_200_000,
    actual: 16_950_000,
    variance: -1_250_000,
    variancePct: 93.13,
    balance: 1_250_000,
    health: 'attention',
    children: [
      {
        id: 'cc-1200',
        label: 'CC 1200 — Tecnologia',
        level: 1,
        parentId: 'root',
        budgeted: 6_100_000,
        actual: 5_720_000,
        variance: -380_000,
        variancePct: 93.77,
        balance: 380_000,
        health: 'attention',
        children: [
          {
            id: 'cat-cloud',
            label: 'Categoria — Cloud & Infra',
            level: 2,
            parentId: 'cc-1200',
            budgeted: 2_800_000,
            actual: 2_980_000,
            variance: 180_000,
            variancePct: 106.43,
            balance: -180_000,
            health: 'over',
          },
          {
            id: 'cat-sw',
            label: 'Categoria — Software',
            level: 2,
            parentId: 'cc-1200',
            budgeted: 3_300_000,
            actual: 2_740_000,
            variance: -560_000,
            variancePct: 83.03,
            balance: 560_000,
            health: 'ok',
          },
        ],
      },
      {
        id: 'cc-3000',
        label: 'CC 3000 — Operações',
        level: 1,
        parentId: 'root',
        budgeted: 9_400_000,
        actual: 9_010_000,
        variance: -390_000,
        variancePct: 95.85,
        balance: 390_000,
        health: 'ok',
      },
    ],
  },
]
