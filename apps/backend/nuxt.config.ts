import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  nitro: {
    preset: 'node-server'
  },
  typescript: {
    strict: true
  },
  runtimeConfig: {
    supabaseKey: process.env.SUPABASE_KEY,
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY
    }
  }
})
