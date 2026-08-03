import { z } from 'zod'
import { requireAuth } from '~/server/utils/require-role'
import { loadProfileVisibleTo } from '~/server/utils/profiles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const id = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant de profil invalide.' })
  }

  // Soi-même, ou un membre du réseau du tuteur connecté. 404 sinon.
  return loadProfileVisibleTo(id.data, user)
})
