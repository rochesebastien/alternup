import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async () => {
  return prisma.courseNote.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      assignment: {
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          course: { select: { id: true, title: true } }
        }
      }
    }
  })
})
