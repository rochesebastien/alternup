import { Prisma } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Course ID is required' })
  }

  try {
    await prisma.course.delete({ where: { id } })
    return { message: 'Course deleted successfully' }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw createError({ statusCode: 404, statusMessage: 'Course not found' })
    }
    throw err
  }
})
