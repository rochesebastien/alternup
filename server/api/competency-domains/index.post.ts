import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { domainCreateSchema } from '~/shared/utils/competencies'
import { formatZodIssues } from '~/shared/utils/auth-credentials'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Tutor)

  const parsed = domainCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données invalides',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const n = await prisma.competencyDomain.count({ where: { tutorId: user.id } })
  const domain = await prisma.competencyDomain.create({
    data: { tutorId: user.id, label: parsed.data.label, position: n }
  })

  return { id: domain.id, label: domain.label }
})
