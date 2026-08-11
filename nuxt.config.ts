// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/image',
    'nuxt-auth-utils'
  ],
  // Police self-hostée (woff2 locaux via @fontsource-variable, aucun fetch réseau)
  css: ['@fontsource-variable/mona-sans/wght.css', '~/assets/css/main.css'],
  // Désactive l'intégration @nuxt/fonts de Nuxt UI : on gère la police nous-mêmes
  // (sinon @nuxt/fonts tente de générer des fallbacks depuis le woff2 variable → crash).
  ui: {
    fonts: false
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
    session: {
      cookie: {
        // Cookie de session réservé à HTTPS. Déclaré ici pour rester surchargeable
        // au runtime : si l'app est exposée en HTTP simple (test derrière une IP,
        // pas de certificat), poser NUXT_SESSION_COOKIE_SECURE=false, sinon le
        // navigateur jette le cookie et la connexion semble « ne rien faire ».
        secure: true
      }
    },
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
        { name: 'description', content: "alternup centralise le suivi de tes alternants et stagiaires : visites, livrables, rapports, compétences." },
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