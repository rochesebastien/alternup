import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { learnerIdsOf } from '~/server/utils/network'
import { profileSelect } from '~/server/utils/profiles'

export default defineEventHandler(async (event) => {
  const tutor = await requireRole(event, Role.Tutor)

  // Uniquement les alternants rattachés à ce tuteur — jamais toute la base.
  const ids = await learnerIdsOf(tutor.id)

  return prisma.user.findMany({
    where: { id: { in: ids }, role: Role.Alternant },
    select: profileSelect,
    orderBy: { createdAt: 'desc' }
  })
})
