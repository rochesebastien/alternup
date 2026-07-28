import { z } from 'zod'
import { requireAuth } from '~/server/utils/require-role'
import { loadSignableReport, signDocument } from '~/server/utils/signatures'

/**
 * Signature horodatée d'un rapport d'étape par l'une des deux parties (tuteur
 * destinataire ou étudiant auteur). Le rapport doit être validé.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })
  }

  const document = await loadSignableReport(idp.data, user)
  return signDocument(document, user)
})
