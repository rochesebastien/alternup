import type { Role } from '@prisma/client'

export default defineNuxtRouteMiddleware((to) => {
  const required = to.meta.requireRole as Role | Role[] | undefined
  if (!required) return

  const allowed = Array.isArray(required) ? required : [required]
  const { user } = useUserSession()

  if (!user.value || !allowed.includes(user.value.role)) {
    return navigateTo('/forbidden')
  }
})
