import { z } from 'zod'
import { requireAuth } from '~/server/utils/require-role'
import { loadSignableCard, signDocument } from '~/server/utils/signatures'

/**
 * Signature horodatée d'un bulletin par l'une des deux parties (tuteur émetteur
 * ou étudiant concerné). Le bulletin doit être publié.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })
  }

  const document = await loadSignableCard(idp.data, user)
  return signDocument(document, user)
})
