import { z } from 'zod'
import { Role } from '@prisma/client'
import { requireRole } from '~/server/utils/require-role'
import { loadNetworkLearner } from '~/server/utils/profiles'

export default defineEventHandler(async (event) => {
  const tutor = await requireRole(event, Role.Tutor)

  const id = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })
  }

  // Alternant/stagiaire du réseau du tuteur uniquement. 404 sinon.
  return loadNetworkLearner(tutor, id.data)
})
