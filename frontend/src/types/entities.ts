/** Identificadores alinhados a UUID/string do Postgres/Supabase */
export type Id = string

export type BudgetStatus = 'draft' | 'published' | 'archived'

export type ActualOrigin = 'manual' | 'import' | 'integracao' | 'erp'
export type ActualRecordStatus = 'pendente' | 'validado' | 'conciliado'

/** Desvio vs orçamento — regras reais vêm do backend */
export type BudgetHealth = 'ok' | 'attention' | 'over'

export type UserRole = 'admin' | 'operador' | 'consulta'

export interface CompanyGroup {
  id: Id
  code: string
  name: string
  description?: string
  active: boolean
  createdAt: string
}

export interface Company {
  id: Id
  companyGroupId: Id
  code: string
  name: string
  taxId?: string
  active: boolean
  createdAt: string
}

export interface CostCenter {
  id: Id
  categoryId: Id
  companyId?: Id
  code: string
  name: string
  active: boolean
}

export interface BudgetItem {
  id: Id
  costCenterId: Id
  companyId?: Id
  code: string
  name: string
  active: boolean
}

export interface Category {
  id: Id
  classId: Id
  code: string
  name: string
  active: boolean
}

export interface LedgerClass {
  id: Id
  companyId?: Id
  code: string
  name: string
  nature?: string
}

export interface Nature {
  id: Id
  code: string
  name: string
}

export interface Project {
  id: Id
  code: string
  name: string
  active: boolean
}


export interface RoleProfile {
  id: Id
  name: string
  key: UserRole | string
  description?: string
}

export interface UserAccessScope {
  companyGroupIds: Id[]
  companyIds: Id[]
  classIds: Id[]
  categoryIds: Id[]
  costCenterIds: Id[]
  budgetItemIds: Id[]
}

export interface UserAccount {
  id: Id
  email: string
  name: string
  role: UserRole
  profileId?: Id
  active: boolean
  lastLoginAt?: string
  access?: UserAccessScope
  allowResumo?: boolean
}

export type BudgetVersionType = 'ORIGINAL' | 'REVISION' | 'FORECAST'

export interface BudgetVersionDetail {
  id: Id
  budgetId: Id
  name: string
  type: BudgetVersionType
  versionNumber: number
  status: BudgetStatus
  baseVersionId?: Id
  createdAt: string
  publishedAt?: string
}

export interface Budget {
  id: Id
  companyGroupId: Id
  companyId?: Id
  year: number
  name: string
  description?: string
  currency: string
  status: BudgetStatus
  createdAt: string
  versions: BudgetVersionDetail[]
}

export interface BudgetVersion {
  id: Id
  year: number
  label: string
  status: BudgetStatus
  companyId: Id
  createdAt: string
  publishedAt?: string
  budgetId?: Id
  name?: string
  type?: BudgetVersionType
  versionNumber?: number
}

export interface BudgetLine {
  id: Id
  versionId: Id
  month: number
  costCenterId: Id
  categoryId: Id
  classId: Id
  natureId: Id
  plannedAmount: number
}

export interface ActualEntry {
  id: Id
  budgetId?: Id
  budgetItemId?: Id
  date: string
  companyId: Id
  costCenterId: Id
  categoryId: Id
  classId?: Id
  projectId?: Id
  description: string
  amount: number
  origin: ActualOrigin
  status: ActualRecordStatus
  sourceRef?: string
}

export interface ComparisonRow {
  id: Id
  label: string
  level: number
  parentId?: Id
  budgeted: number
  actual: number
  variance: number
  variancePct: number
  balance: number
  health: BudgetHealth
  code?: string
  children?: ComparisonRow[]
}

export interface SignedUrlAsset {
  path: string
  signedUrl: string
  expiresAt: string
}

export interface ForecastProjection {
  actualYtd: number
  budgetYtd: number
  budgetAnnual: number
  monthsClosed: number
  runRateRatio: number
  projectedRemaining: number
  methodology: string
}

export interface ForecastRevision {
  id: Id
  label: string
  baseVersionId: Id
  createdAt: string
  createdBy: string
  totals: { original: number; revised: number; forecast: number }
  projection: ForecastProjection
}

export interface AuditLogEntry {
  id: Id
  action: string
  entity: string
  entityId: string
  actor: string
  at: string
  description: string
  metadata?: Record<string, unknown>
}

export interface SystemParameter {
  id: Id
  key: string
  value: string
  description?: string
}

export interface IntegrationEndpoint {
  id: Id
  name: string
  provider: string
  status: 'ativa' | 'pausada' | 'erro'
  lastSyncAt?: string
}
