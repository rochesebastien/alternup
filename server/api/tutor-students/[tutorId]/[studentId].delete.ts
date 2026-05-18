import { Prisma } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const tutorId = getRouterParam(event, 'tutorId')
  const studentId = getRouterParam(event, 'studentId')

  if (!tutorId || !studentId) {
    throw createError({ statusCode: 400, statusMessage: 'Both tutorId and studentId are required' })
  }

  try {
    await prisma.tutorStudent.delete({
      where: { tutorId_studentId: { tutorId, studentId } }
    })
    return { message: 'Relation deleted successfully' }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw createError({ statusCode: 404, statusMessage: 'Relation not found' })
    }
    throw err
  }
})
