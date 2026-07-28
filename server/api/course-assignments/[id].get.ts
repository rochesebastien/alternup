import { z } from 'zod'
import { requireAuth } from '~/server/utils/require-role'
import { loadCourseAssignmentVisibleTo } from '~/server/utils/courses'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const id = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: "Identifiant d'affectation invalide." })
  }

  // Étudiant concerné, tuteur créateur du cours, ou tuteur de l'étudiant. 404 sinon.
  return loadCourseAssignmentVisibleTo(id.data, user)
})
