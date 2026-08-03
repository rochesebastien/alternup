import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { learnerIdsOf } from '~/server/utils/network'
import { notifyUser } from '~/server/utils/notifications'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { visitCreateSchema } from '~/shared/utils/tutor-visits'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Tutor)

  const parsed = visitCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données de visite invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const { studentId, scheduledAt, mode, location } = parsed.data

  const learnerIds = await learnerIdsOf(user.id)
  if (!learnerIds.includes(studentId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Cet étudiant ne fait pas partie de votre réseau."
    })
  }

  const visit = await prisma.tutorVisit.create({
    data: {
      tutorId: user.id,
      studentId,
      scheduledAt: new Date(scheduledAt),
      mode: mode ?? null,
      location: location ?? null
    }
  })

  await notifyUser(studentId, {
    type: 'visite_planifiee',
    title: 'Nouvelle visite planifiée',
    body: `${user.firstName} ${user.lastName} a planifié une visite${
      location ? ` — ${location}` : ''
    }.`,
    link: '/visites'
  })

  return visit
})
