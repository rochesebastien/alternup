import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })
  }

  try {
    await prisma.announcementRecipient.update({
      where: {
        announcementId_studentId: {
          announcementId: idp.data,
          studentId: user.id
        }
      },
      data: { readAt: new Date() }
    })
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Annonce introuvable' })
  }

  return { ok: true }
})
