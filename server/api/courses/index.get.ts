import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { coursePersonSelect } from '~/server/utils/courses'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Tuteur : ses propres cours. Learner : les cours auxquels il est affecté.
  const where =
    user.role === Role.Tutor
      ? { createdById: user.id }
      : { assignments: { some: { studentId: user.id } } }

  return prisma.course.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: coursePersonSelect }
    }
  })
})
