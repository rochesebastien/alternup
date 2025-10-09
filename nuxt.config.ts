// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/image',
    '@nuxtjs/color-mode'
  ],
  css: ['~/assets/css/main.css'],
  typescript: {
    strict: true,
    shim: false,
    typeCheck: false
  },
  devtools: { enabled: process.env.NODE_ENV === 'development' },
  runtimeConfig: {
    // Clés privées (disponibles uniquement côté serveur)
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
    jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key',
    public: {
      // Clés publiques (disponibles côté client)
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY,
      appVersion: process.env.APP_VERSION || '1.0.0'
    }
  },
  app: {
    head: {
      title: 'Alternup - Gestion des alternances',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Application de gestion des alternances avec NuxtJS et Supabase' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },
  nitro: {
    compressPublicAssets: true,
    timing: process.env.NODE_ENV === 'development',
    cors: {
      origin: process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true
    }
  },
  colorMode: {
    classSuffix: ''
  },
  image: {
    provider: 'ipx'
  }
})