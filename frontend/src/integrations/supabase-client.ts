import { env } from '@/lib/env'

/**
 * Cliente Supabase opcional apenas para recursos complementares controlados pelo backend
 * (ex.: realtime, presença). A regra de negócio e persistência principal vêm da API.
 */
export async function getOptionalSupabase() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false },
  })
}
