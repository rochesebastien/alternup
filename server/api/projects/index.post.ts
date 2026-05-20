import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { projectCreateSchema } from '~/shared/utils/projects'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Tutor)

  const parsed = projectCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données de projet invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  return prisma.project.create({
    data: { ...parsed.data, createdById: user.id },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true }
      }
    }
  })
})
