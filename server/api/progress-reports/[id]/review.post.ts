import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { loadReportVisibleTo } from '~/server/utils/reports'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { reportReviewSchema, canTransition } from '~/shared/utils/progress-reports'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Tutor)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })
  }

  const report = await loadReportVisibleTo(idp.data, user)
  if (report.tutorId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const parsed = reportReviewSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Décision de revue invalide.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const { decision, feedback } = parsed.data
  if (!canTransition(report.status, decision)) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Transition non autorisée.'
    })
  }

  return prisma.progressReport.update({
    where: { id: report.id },
    data: {
      status: decision,
      tutorFeedback: feedback ?? null,
      reviewedAt: new Date()
    }
  })
})
