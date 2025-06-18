import { createClient } from '@supabase/supabase-js'
export default defineNitroPlugin((nitroApp) => {
  const config = useRuntimeConfig()
  const supabase = createClient(config.supabaseUrl, config.supabaseKey)
  nitroApp.hooks.hook('request', (event) => {
    event.context.supabase = supabase
  })
})
