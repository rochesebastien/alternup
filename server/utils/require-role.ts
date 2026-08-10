import type { H3Event } from 'h3'
import type { Role } from '@prisma/client'

export async function requireAuth(event: H3Event) {
  const { user } = await requireUserSession(event)
  return user
}

export async function requireRole(
  event: H3Event,
  ...allowed: [Role, ...Role[]]
) {
  const user = await requireAuth(event)
  if (!allowed.includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Accès refusé.' })
  }
  return user
}
