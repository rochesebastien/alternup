import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async () => {
  return prisma.user.findMany({
    where: { role: Role.Alternant },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { createdAt: 'desc' }
  })
})
