import { prisma } from '~/server/utils/prisma'

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true
} as const

export default defineEventHandler(async () => {
  return prisma.tutorStudent.findMany({
    orderBy: { addedAt: 'desc' },
    include: {
      tutor: { select: userSelect },
      student: { select: userSelect }
    }
  })
})
