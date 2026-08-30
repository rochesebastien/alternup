import {
  isRoleDependent,
  legacyPathForRole,
  resolveLegacyTarget
} from '~/shared/utils/legacy-routes'

/**
 * Redirige les anciennes routes (pré-split ADR-0001) vers les espaces
 * `/tuteur` et `/alternant`. Exécuté après `auth.global.ts` (ordre alphabétique
 * des middlewares globaux : auth → legacy-redirect → space) :
 *   - cible fixe (routes mono-rôle) → 301, cacheable ;
 *   - cible dépendante du rôle de session → 302 (la réponse varie par
 *     utilisateur). Non connecté, `auth.global.ts` a déjà redirigé vers /login
 *     et le `?redirect=` legacy sera re-résolu après connexion.
 */
export default defineNuxtRouteMiddleware((to) => {
  const target = resolveLegacyTarget(to.path)
  if (!target) return

  if (!isRoleDependent(target)) {
    return navigateTo(
      { path: target, query: to.query, hash: to.hash },
      { redirectCode: 301 }
    )
  }

  const { user } = useUserSession()
  if (!user.value) return

  return navigateTo(
    { path: legacyPathForRole(target, user.value.role), query: to.query, hash: to.hash },
    { redirectCode: 302 }
  )
})
