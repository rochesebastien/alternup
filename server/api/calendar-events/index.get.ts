import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'

const include = {
  student: { select: { id: true, firstName: true, lastName: true, email: true } },
  tutor: { select: { id: true, firstName: true, lastName: true, email: true } },
  courseAssignment: {
    include: { course: { select: { id: true, title: true } } }
  }
} as const

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const where =
    user.role === Role.Tutor
      ? { tutorId: user.id }
      : { studentId: user.id }

  return prisma.calendarEvent.findMany({
    where,
    orderBy: { startTime: 'asc' },
    include
  })
})
