import { isPublicPage } from '~/shared/utils/public-routes'

export default defineNuxtRouteMiddleware((to) => {
  if (to.meta.auth === false) return
  if (isPublicPage(to.path)) return
  // Route inconnue : laisser Nuxt rendre la page 404 (error.vue) plutôt que
  // d'exiger une connexion pour découvrir que la page n'existe pas.
  if (to.matched.length === 0) return

  const { loggedIn } = useUserSession()
  if (!loggedIn.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  }
})
