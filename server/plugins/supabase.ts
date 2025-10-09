import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'

export default defineNitroPlugin((nitroApp) => {
  const config = useRuntimeConfig()
  
  const supabaseUrl = config.supabaseUrl
  const supabaseKey = config.supabaseKey
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials are missing. Please check your environment variables.')
  }
  
  const supabase = createClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: true
      }
    }
  )
  
  // Ajouter l'instance supabase au contexte pour chaque requête
  nitroApp.hooks.hook('request', (event) => {
    event.context.supabase = supabase
  })
  
  // Loguer les erreurs Supabase
  nitroApp.hooks.hook('error', (error) => {
    if (error.message?.includes('Supabase')) {
      console.error('Supabase Error:', error)
    }
  })
})