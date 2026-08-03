import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { coursePersonSelect, loadCourseOwnedBy } from '~/server/utils/courses'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { courseUpdateSchema } from '~/shared/utils/courses'

export default defineEventHandler(async (event) => {
  const tutor = await requireRole(event, Role.Tutor)

  const id = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant de cours invalide.' })
  }

  await loadCourseOwnedBy(id.data, tutor)

  const parsed = courseUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données de cours invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  // `createdById` n'est pas modifiable : il est absent du schéma.
  return prisma.course.update({
    where: { id: id.data },
    data: parsed.data,
    include: {
      createdBy: { select: coursePersonSelect }
    }
  })
})
