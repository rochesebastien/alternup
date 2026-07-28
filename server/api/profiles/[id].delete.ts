import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { loadNetworkLearner } from '~/server/utils/profiles'

export default defineEventHandler(async (event) => {
  const tutor = await requireRole(event, Role.Tutor)

  const id = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant de profil invalide.' })
  }

  // Uniquement un learner du réseau du tuteur : jamais un autre tuteur, jamais soi-même.
  await loadNetworkLearner(tutor, id.data)

  await prisma.user.delete({ where: { id: id.data } })
  return { message: 'Profil supprimé.' }
})
