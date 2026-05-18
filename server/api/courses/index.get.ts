import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async () => {
  return prisma.course.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true }
      }
    }
  })
})
