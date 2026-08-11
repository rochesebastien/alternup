import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { loadEditableEntry } from '~/server/utils/presence-entries'

/** Annule un pointage (l'apprenant concerné ou son tuteur). */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const id = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant de pointage invalide.' })
  }

  const entry = await loadEditableEntry(id.data, user)
  await prisma.presenceEntry.delete({ where: { id: entry.id } })

  return { ok: true }
})
