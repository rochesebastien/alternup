import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { loadDomainOwnedBy } from '~/server/utils/competencies'
import { competencyCreateSchema } from '~/shared/utils/competencies'
import { formatZodIssues } from '~/shared/utils/auth-credentials'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Tutor)

  const parsed = competencyCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données invalides',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const { domainId, label } = parsed.data
  await loadDomainOwnedBy(domainId, user)

  const n = await prisma.competency.count({ where: { domainId } })
  const competency = await prisma.competency.create({
    data: { domainId, label, position: n }
  })

  return { id: competency.id, label: competency.label }
})
