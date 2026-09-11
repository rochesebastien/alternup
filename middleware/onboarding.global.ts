import { isPublicPage } from '~/shared/utils/public-routes'
import { onboardingRedirect } from '~/shared/utils/onboarding'

/**
 * Onboarding de première connexion : tant que le questionnaire n'a été ni
 * terminé ni passé (`user.onboarded`, recopié dans la session), toute page
 * protégée renvoie sur /onboarding. Exécuté après `auth.global.ts` (ordre
 * alphabétique) : un visiteur anonyme a déjà été redirigé vers /login. Les
 * pages publiques restent libres. La règle elle-même est pure et testée
 * (`onboardingRedirect`, shared/utils/onboarding.ts).
 */
export default defineNuxtRouteMiddleware((to) => {
  if (to.meta.auth === false) return
  if (isPublicPage(to.path)) return
  if (to.matched.length === 0) return

  const { loggedIn, user } = useUserSession()
  if (!loggedIn.value || !user.value) return

  const target = onboardingRedirect(to.path, user.value, to.query.again === '1')
  if (target) return navigateTo(target)
})
