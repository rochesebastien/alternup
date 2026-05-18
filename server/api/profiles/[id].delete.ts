import { Prisma } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Profile ID is required' })
  }

  try {
    await prisma.user.delete({ where: { id } })
    return { message: 'Profile deleted successfully' }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
    }
    throw err
  }
})
