import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { loadCourseAssignmentOwnedBy } from '~/server/utils/courses'

export default defineEventHandler(async (event) => {
  const tutor = await requireRole(event, Role.Tutor)

  const id = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: "Identifiant d'affectation invalide." })
  }

  await loadCourseAssignmentOwnedBy(id.data, tutor)

  await prisma.courseAssignment.delete({ where: { id: id.data } })
  return { message: 'Affectation supprimée.' }
})
