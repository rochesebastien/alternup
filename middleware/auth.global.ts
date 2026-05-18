import { isPublicPage } from '~/shared/utils/public-routes'

export default defineNuxtRouteMiddleware((to) => {
  if (to.meta.auth === false) return
  if (isPublicPage(to.path)) return

  const { loggedIn } = useUserSession()
  if (!loggedIn.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  }
})
