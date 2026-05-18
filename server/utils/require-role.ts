import type { H3Event } from 'h3'
import type { Role } from '@prisma/client'

export async function requireRole(event: H3Event, ...allowed: Role[]) {
  const { user } = await requireUserSession(event)
  if (!allowed.includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return user
}
