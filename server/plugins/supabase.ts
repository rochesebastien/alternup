import { createClient } from '@supabase/supabase-js'

let supabaseClient: any = null

export default nitroPlugin(async (nitroApp) => {
  const config = useRuntimeConfig()
  
  supabaseClient = createClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey
  )
  
  console.log('Supabase client initialized')
})

export function getSupabaseClient() {
  if (!supabaseClient) {
    const config = useRuntimeConfig()
    supabaseClient = createClient(
      config.supabaseUrl,
      config.supabaseServiceRoleKey
    )
  }
  return supabaseClient
}