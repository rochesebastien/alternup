import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { loadCalendarEventVisibleTo } from '~/server/utils/courses'

const uuid = z.string().uuid()

export default defineEventHandler(async (event) => {
  const tutor = await requireRole(event, Role.Tutor)
  const id = uuid.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: "Identifiant d'événement invalide." })
  }

  const existing = await loadCalendarEventVisibleTo(id.data, tutor)
  if (existing.tutorId !== tutor.id) {
    throw createError({ statusCode: 403, statusMessage: 'Accès refusé.' })
  }

  await prisma.calendarEvent.delete({ where: { id: id.data } })
  return { message: 'Événement supprimé.' }
})
