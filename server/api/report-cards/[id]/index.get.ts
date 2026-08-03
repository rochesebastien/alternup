import { z } from 'zod'
import { requireAuth } from '~/server/utils/require-role'
import { loadCardVisibleTo } from '~/server/utils/report-cards'
import { signableCardOf, signatureBlockOf } from '~/server/utils/signatures'

/**
 * Détail d'un bulletin, visible par l'étudiant concerné et par le tuteur de la
 * période (404 sinon). Sert l'écran signable + imprimable `/bulletins/carte/:id`.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })
  }

  const card = await loadCardVisibleTo(idp.data, user)
  const signatures = await signatureBlockOf(signableCardOf(card))

  return { ...card, signatures }
})
