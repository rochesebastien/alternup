import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { reportCreateSchema } from '~/shared/utils/progress-reports'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Alternant, Role.Stagiaire)

  const link = await prisma.tutorStudent.findFirst({
    where: { studentId: user.id }
  })
  if (!link) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Aucun tuteur rattaché à votre compte.'
    })
  }

  const parsed = reportCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données de rapport invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const { title, body, difficulties, learnings, periodStart, periodEnd } =
    parsed.data

  return prisma.progressReport.create({
    data: {
      studentId: user.id,
      tutorId: link.tutorId,
      status: 'brouillon',
      title,
      body,
      difficulties: difficulties ?? null,
      learnings: learnings ?? null,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd)
    }
  })
})
