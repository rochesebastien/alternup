import { z } from 'zod'
import { requireAuth } from '~/server/utils/require-role'
import { loadCourseVisibleTo } from '~/server/utils/courses'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const id = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant de cours invalide.' })
  }

  // Tuteur créateur (toutes les affectations) ou learner affecté (les siennes). 404 sinon.
  return loadCourseVisibleTo(id.data, user)
})
