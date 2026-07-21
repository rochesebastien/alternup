import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { loadOwnedEvent } from '~/server/utils/attendance'
import { attendanceInputSchema } from '~/shared/utils/attendance'
import { formatZodIssues } from '~/shared/utils/auth-credentials'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Tutor)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide' })
  }

  const ev = await loadOwnedEvent(idp.data, user)

  const body = await readBody(event)
  const parsed = attendanceInputSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données invalides',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }
  const data = parsed.data

  const attendance = await prisma.attendance.upsert({
    where: { eventId: ev.id },
    create: {
      eventId: ev.id,
      recordedById: user.id,
      status: data.status,
      minutesLate: data.minutesLate ?? null,
      justification: data.justification ?? null
    },
    update: {
      status: data.status,
      minutesLate: data.minutesLate ?? null,
      justification: data.justification ?? null,
      recordedById: user.id,
      recordedAt: new Date()
    }
  })

  return attendance
})
