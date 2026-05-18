import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Tutor ID is required' })
  }

  return prisma.tutorStudent.findMany({
    where: { tutorId: id },
    orderBy: { addedAt: 'desc' },
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true }
      }
    }
  })
})
