import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { loadEntryOwnedByTutor } from '~/server/utils/presence-entries'

/**
 * Supprime un pointage — réservé au tuteur (anti-triche : un apprenant ne
 * peut plus effacer son propre pointage une fois enregistré).
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (user.role !== Role.Tutor) {
    throw createError({ statusCode: 403, statusMessage: 'Seul votre tuteur peut supprimer un pointage.' })
  }

  const id = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant de pointage invalide.' })
  }

  const entry = await loadEntryOwnedByTutor(id.data, user.id)
  await prisma.presenceEntry.delete({ where: { id: entry.id } })

  return { ok: true }
})
