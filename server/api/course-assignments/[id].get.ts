import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Assignment ID is required' })
  }

  const assignment = await prisma.courseAssignment.findUnique({
    where: { id },
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true }
      },
      course: true,
      notes: true
    }
  })

  if (!assignment) {
    throw createError({ statusCode: 404, statusMessage: 'Assignment not found' })
  }

  return assignment
})
