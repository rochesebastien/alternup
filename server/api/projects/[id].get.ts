import { z } from 'zod'
import { requireAuth } from '~/server/utils/require-role'
import { loadProjectVisibleTo } from '~/server/utils/projects'

const uuid = z.string().uuid()

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = uuid.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant de projet invalide.' })
  }
  return loadProjectVisibleTo(id.data, user)
})
