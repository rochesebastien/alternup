import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { loadCourseOwnedBy } from '~/server/utils/courses'

export default defineEventHandler(async (event) => {
  const tutor = await requireRole(event, Role.Tutor)

  const id = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant de cours invalide.' })
  }

  await loadCourseOwnedBy(id.data, tutor)

  await prisma.course.delete({ where: { id: id.data } })
  return { message: 'Cours supprimé.' }
})
