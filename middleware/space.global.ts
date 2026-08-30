import { rolesAllowedFor } from '~/shared/utils/auth-redirect'

/**
 * Garde par préfixe d'espace (ADR-0001 §4) : toute route sous `/tuteur` ou
 * `/alternant` n'est accessible qu'aux rôles de l'espace. Exécuté après
 * `auth.global.ts` (ordre alphabétique) : la session est déjà exigée pour ces
 * routes, il ne reste qu'à vérifier le rôle. La sécurité réelle reste côté
 * serveur (`requireRole`, `assertCanViewStudent`).
 */
export default defineNuxtRouteMiddleware((to) => {
  const allowed = rolesAllowedFor(to.path)
  if (!allowed) return

  const { user } = useUserSession()
  if (!user.value || !allowed.includes(user.value.role)) {
    return navigateTo('/forbidden')
  }
})
