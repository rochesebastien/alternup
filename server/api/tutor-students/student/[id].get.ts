import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Student ID is required' })
  }

  return prisma.tutorStudent.findMany({
    where: { studentId: id },
    orderBy: { addedAt: 'desc' },
    include: {
      tutor: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true }
      }
    }
  })
})
