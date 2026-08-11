import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'

/**
 * Révoque (supprime) une invitation émise par le tuteur connecté. Le lien
 * correspondant cesse immédiatement de fonctionner. Une invitation déjà
 * acceptée peut aussi être supprimée : cela ne retire pas la personne du
 * réseau, seulement la ligne de suivi.
 */
export default defineEventHandler(async (event) => {
  const tutor = await requireRole(event, Role.Tutor)

  const id = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: "Identifiant d'invitation invalide." })
  }

  const invitation = await prisma.invitation.findUnique({ where: { id: id.data } })
  if (!invitation || invitation.tutorId !== tutor.id) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation introuvable.' })
  }

  await prisma.invitation.delete({ where: { id: id.data } })
  return { ok: true }
})
