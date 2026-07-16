export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  appName: import.meta.env.VITE_APP_NAME ?? 'BUDDGET',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  /**
   * Mock da API é opt-in. Em produção/dev integrado use a API real (`false`/ausente).
   * Ative com `VITE_USE_MOCK_API=true` apenas para demo offline.
   */
  useMockApi: import.meta.env.VITE_USE_MOCK_API === 'true',
} as const
