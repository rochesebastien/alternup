import { createClient } from '@supabase/supabase-js'

let supabaseClient: any = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    const config = useRuntimeConfig()
    supabaseClient = createClient(config.public.supabaseUrl, config.supabaseKey)
  }
  return supabaseClient
}