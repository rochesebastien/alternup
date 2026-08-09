import { z } from 'zod'
import { requireAuth } from '~/server/utils/require-role'
import { loadCalendarEventVisibleTo } from '~/server/utils/courses'

const uuid = z.string().uuid()

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = uuid.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: "Identifiant d'événement invalide." })
  }
  return loadCalendarEventVisibleTo(id.data, user)
})
