import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (user.role === Role.Tutor) {
    return prisma.tutorVisit.findMany({
      where: { tutorId: user.id },
      orderBy: { scheduledAt: 'desc' },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } }
      }
    })
  }

  return prisma.tutorVisit.findMany({
    where: { studentId: user.id },
    orderBy: { scheduledAt: 'desc' },
    include: {
      tutor: { select: { id: true, firstName: true, lastName: true } }
    }
  })
})
