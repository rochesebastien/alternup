import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  
  const supabaseUrl = config.public.supabaseUrl
  const supabaseKey = config.public.supabaseKey
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials are missing. Please check your environment variables.')
  }
  
  const supabase = createClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  )
  
  return {
    provide: {
      supabase
    }
  }
})