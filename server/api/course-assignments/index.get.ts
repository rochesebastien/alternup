import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async () => {
  return prisma.courseAssignment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true }
      },
      course: true
    }
  })
})
