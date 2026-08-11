import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { loadEntryOwnedByTutor, toPresenceEntryRevision } from '~/server/utils/presence-entries'
import type { PresenceEntryRevision } from '~/shared/utils/presence-entries'

/**
 * Historique de modification d'un pointage — réservé au tuteur, pour repérer
 * une retouche après coup (qui, quand, quelles valeurs).
 */
export default defineEventHandler(async (event): Promise<PresenceEntryRevision[]> => {
  const user = await requireAuth(event)
  if (user.role !== Role.Tutor) {
    throw createError({ statusCode: 403, statusMessage: 'Accès réservé au tuteur.' })
  }

  const id = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant de pointage invalide.' })
  }

  const entry = await loadEntryOwnedByTutor(id.data, user.id)

  const revisions = await prisma.presenceEntryRevision.findMany({
    where: { entryId: entry.id },
    orderBy: { changedAt: 'desc' },
    include: {
      changedBy: { select: { id: true, firstName: true, lastName: true } }
    }
  })

  return revisions.map(toPresenceEntryRevision)
})
