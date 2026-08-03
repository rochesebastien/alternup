import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { coursePersonSelect } from '~/server/utils/courses'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { courseCreateSchema } from '~/shared/utils/courses'

export default defineEventHandler(async (event) => {
  const tutor = await requireRole(event, Role.Tutor)

  const parsed = courseCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données de cours invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  // `createdById` vient de la session, jamais du body.
  return prisma.course.create({
    data: { ...parsed.data, createdById: tutor.id },
    include: {
      createdBy: { select: coursePersonSelect }
    }
  })
})
