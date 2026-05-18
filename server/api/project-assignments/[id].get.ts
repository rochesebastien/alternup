import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Assignment ID is required' })
  }

  const assignment = await prisma.projectAssignment.findUnique({
    where: { id },
    include: {
      project: true,
      student: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  })

  if (!assignment) {
    throw createError({ statusCode: 404, statusMessage: 'Assignment not found' })
  }

  return assignment
})
