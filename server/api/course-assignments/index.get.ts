import { Role } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { coursePersonSelect } from '~/server/utils/courses'
import { learnerIdsOf } from '~/server/utils/network'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Learner : ses propres affectations. Tuteur : celles de ses cours ou de son réseau.
  let where: Prisma.CourseAssignmentWhereInput = { studentId: user.id }
  if (user.role === Role.Tutor) {
    const learnerIds = await learnerIdsOf(user.id)
    where = {
      OR: [{ course: { createdById: user.id } }, { studentId: { in: learnerIds } }]
    }
  }

  return prisma.courseAssignment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      student: { select: coursePersonSelect },
      course: true
    }
  })
})
