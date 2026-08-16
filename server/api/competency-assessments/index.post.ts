import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { loadCompetencyOwnedBy } from '~/server/utils/competencies'
import { learnerIdsOf } from '~/server/utils/network'
import { assessSchema } from '~/shared/utils/competencies'
import { formatZodIssues } from '~/shared/utils/auth-credentials'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Tutor)

  const parsed = assessSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données invalides',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const { competencyId, studentId, level, comment } = parsed.data

  const learnerIds = await learnerIdsOf(user.id)
  if (!learnerIds.includes(studentId)) {
    throw createError({ statusCode: 400, statusMessage: 'Cet étudiant n\'est pas sous votre responsabilité.' })
  }

  await loadCompetencyOwnedBy(competencyId, user)

  const assessment = await prisma.competencyAssessment.create({
    data: {
      competencyId,
      studentId,
      level,
      comment: comment ?? null,
      assessedById: user.id
    }
  })

  return {
    id: assessment.id,
    competencyId: assessment.competencyId,
    studentId: assessment.studentId,
    level: assessment.level,
    comment: assessment.comment,
    createdAt: assessment.createdAt
  }
})
