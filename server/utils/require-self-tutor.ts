import type { H3Event } from 'h3'
import { Role } from '@prisma/client'

export async function requireSelfTutor(event: H3Event) {
  const { user } = await requireUserSession(event)
  if (user.role !== Role.Tutor) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  const id = getRouterParam(event, 'id')
  if (id !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return user
}
