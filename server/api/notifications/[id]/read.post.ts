import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })
  }

  // updateMany + filtre sur userId : une notification d'autrui est simplement
  // « introuvable », on ne divulgue pas son existence.
  const { count } = await prisma.notification.updateMany({
    where: { id: idp.data, userId: user.id, readAt: null },
    data: { readAt: new Date() }
  })

  if (count === 0) {
    const exists = await prisma.notification.count({
      where: { id: idp.data, userId: user.id }
    })
    if (exists === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Notification introuvable' })
    }
  }

  return { ok: true }
})
