export interface ApiPagination {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface ApiMeta {
  requestId?: string
  [key: string]: unknown
}

export interface ApiErrorBody {
  code: string
  message: string
  details?: unknown
}

export interface ApiSuccessResponse<T> {
  data: T
  meta?: ApiMeta
  pagination?: ApiPagination
  error?: undefined
}

export interface ApiErrorResponse {
  data?: null | undefined
  meta?: ApiMeta
  pagination?: undefined
  error: ApiErrorBody
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export function isApiError<T>(r: ApiResponse<T>): r is ApiErrorResponse {
  return r.error !== undefined
}

export interface ListParams {
  page?: number
  pageSize?: number
  sort?: string
  order?: 'asc' | 'desc'
  search?: string
}
