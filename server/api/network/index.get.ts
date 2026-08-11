import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { networkIdsOf } from '~/server/utils/network'

/**
 * Personnes que l'utilisateur connecté peut adresser (destinataires possibles
 * d'une annonce) : ses apprenants s'il est tuteur, ses tuteurs sinon. Route
 * volontairement indépendante du rôle, contrairement à
 * `/api/tutors/[id]/learners` qui n'existe que pour les tuteurs.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const ids = await networkIdsOf(user)
  if (ids.length === 0) return []

  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
  })
})
