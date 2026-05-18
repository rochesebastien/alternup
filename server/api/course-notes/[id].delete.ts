import { Prisma } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Note ID is required' })
  }

  try {
    await prisma.courseNote.delete({ where: { id } })
    return { message: 'Note deleted successfully' }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw createError({ statusCode: 404, statusMessage: 'Note not found' })
    }
    throw err
  }
})
