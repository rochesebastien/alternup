import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'

const include = {
  project: { select: { id: true, title: true, internal: true, createdById: true } },
  student: { select: { id: true, firstName: true, lastName: true, email: true } },
  updates: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, role: true } }
    }
  }
} as const

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const where =
    user.role === Role.Tutor
      ? { project: { createdById: user.id } }
      : { studentId: user.id }

  return prisma.projectAssignment.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include
  })
})
