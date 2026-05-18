import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async () => {
  return prisma.projectAssignment.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      project: { select: { id: true, title: true, internal: true } },
      student: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  })
})
