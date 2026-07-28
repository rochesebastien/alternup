import { z } from 'zod'
import { requireAuth } from '~/server/utils/require-role'
import { loadVisitVisibleTo } from '~/server/utils/tutor-visits'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide' })
  }

  return loadVisitVisibleTo(idp.data, user)
})
