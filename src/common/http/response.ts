export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const ok = <T>(data: T, meta?: Record<string, unknown>) => ({
  data,
  meta
});

export const paged = <T>(data: T, pagination: PaginationMeta, meta?: Record<string, unknown>) => ({
  data,
  pagination,
  meta
});

export const fail = (code: string, message: string, details?: unknown) => ({
  error: {
    code,
    message,
    details
  }
});

