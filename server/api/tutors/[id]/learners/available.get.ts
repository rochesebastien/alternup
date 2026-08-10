import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireSelfTutor } from '~/server/utils/require-self-tutor'
import { learnerIdsOf } from '~/server/utils/network'

export default defineEventHandler(async (event) => {
  const tutor = await requireSelfTutor(event)

  // Comptes déjà rattachés : on les exclut pour ne proposer que du rattachable.
  const linkedIds = await learnerIdsOf(tutor.id)

  return prisma.user.findMany({
    where: {
      role: { in: [Role.Alternant, Role.Stagiaire] },
      id: { notIn: linkedIds }
    },
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
  })
})
