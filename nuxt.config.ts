// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/image',
    '@nuxt/fonts',
    'nuxt-auth-utils'
  ],
  css: ['~/assets/css/main.css'],
  fonts: {
    families: [
      { name: 'Inter', provider: 'google', weights: [400, 500, 600, 700, 800, 900] }
    ]
  },
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
      title: "Manage internships and apprenticeships - Alternup",
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: "alternup centralise le suivi de tes alternants et stagiaires — visites, livrables, rapports, compétences." },
        { name: 'theme-color', content: '#F1DE02' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
      ]
    }
  },
  nitro: {
    compressPublicAssets: true,
    timing: process.env.NODE_ENV === 'development'
  },
  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light'
  },
  image: {
    provider: 'ipx'
  }
})