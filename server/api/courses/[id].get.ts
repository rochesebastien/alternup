import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Course ID is required' })
  }

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true }
      },
      assignments: {
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true }
          }
        }
      }
    }
  })

  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Course not found' })
  }

  return course
})
