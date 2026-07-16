import { env } from '@/lib/env'
import { apiGetData, apiPostData } from '@/services/api/client'
import { mockDelay } from '@/mocks/delay'
import type { SignedUrlAsset } from '@/types/entities'

export interface ReportJobPayload {
  kind: 'csv' | 'xlsx' | 'pdf'
  reportKey: string
  filters: Record<string, unknown>
}

export const reportsService = {
  async exportReport(payload: ReportJobPayload): Promise<{ downloadUrl?: string; jobId?: string } | SignedUrlAsset> {
    if (env.useMockApi) {
      await mockDelay(500)
      return {
        path: `reports/${payload.reportKey}.${payload.kind}`,
        signedUrl: `https://example.invalid/signed/${payload.reportKey}.${payload.kind}`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      }
    }
    return apiPostData('/reports/export', payload)
  },

  async listDefinitions(signal?: AbortSignal): Promise<{ key: string; title: string; description?: string }[]> {
    if (env.useMockApi) {
      await mockDelay(200)
      return [
        { key: 'exec_summary', title: 'Resumo executivo', description: 'KPIs consolidados por empresa.' },
        { key: 'variance_detail', title: 'Detalhamento de desvios', description: 'Linha a linha com hierarquia.' },
        { key: 'cc_execution', title: 'Execução por centro de custo', description: '% de execução e saldos.' },
      ]
    }
    return apiGetData('/reports/definitions', undefined, signal)
  },
}
