// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/image',
    '@nuxtjs/color-mode',
    'nuxt-auth-utils'
  ],
  css: ['~/assets/css/main.css'],
  typescript: {
    strict: true,
    shim: false,
    typeCheck: false
  },
  devtools: { enabled: process.env.NODE_ENV === 'development' },
  runtimeConfig: {
    // Serveur uniquement
    databaseUrl: process.env.DATABASE_URL,
    // nuxt-auth-utils lit NUXT_SESSION_PASSWORD automatiquement via runtimeConfig.session
    public: {
      appVersion: process.env.APP_VERSION || '1.0.0'
    }
  },
  app: {
    head: {
      title: 'Alternup - Gestion des alternances',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Application de gestion des alternances avec NuxtJS et PostgreSQL' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },
  nitro: {
    compressPublicAssets: true,
    timing: process.env.NODE_ENV === 'development'
  },
  colorMode: {
    classSuffix: ''
  },
  image: {
    provider: 'ipx'
  }
})