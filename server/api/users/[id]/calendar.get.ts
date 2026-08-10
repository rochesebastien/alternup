import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { assertCanReadAssignment } from '~/server/utils/courses'

const uuid = z.string().uuid()

const include = {
  tutor: { select: { id: true, firstName: true, lastName: true } },
  student: { select: { id: true, firstName: true, lastName: true } },
  courseAssignment: {
    include: { course: { select: { id: true, title: true } } }
  }
} as const

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = uuid.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant utilisateur invalide.' })
  }

  await assertCanReadAssignment(user, id.data)

  return prisma.calendarEvent.findMany({
    where: { studentId: id.data },
    orderBy: { startTime: 'asc' },
    include
  })
})
