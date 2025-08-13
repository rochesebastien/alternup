export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  typescript: { 
    strict: true 
  },
  runtimeConfig: {
    // Privé serveur uniquement
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    public: {
      // Public côté client
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY
    }
  },
  nitro: {
    preset: 'node-server'
  }
})