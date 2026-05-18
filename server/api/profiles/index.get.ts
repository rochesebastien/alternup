import { prisma } from '~/server/utils/prisma'
import type { Role } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const role = typeof query.role === 'string' ? (query.role as Role) : undefined

  return prisma.user.findMany({
    where: role ? { role } : undefined,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  })
})
