import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'

const include = {
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true }
  }
} as const

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const where =
    user.role === Role.Tutor
      ? { createdById: user.id }
      : { assignments: { some: { studentId: user.id } } }

  return prisma.project.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include
  })
})
