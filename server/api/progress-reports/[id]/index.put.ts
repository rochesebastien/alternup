import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { loadReportVisibleTo } from '~/server/utils/reports'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { reportCreateSchema } from '~/shared/utils/progress-reports'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })
  }

  const report = await loadReportVisibleTo(idp.data, user)
  if (report.studentId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Accès refusé.' })
  }
  if (!['brouillon', 'a_revoir'].includes(report.status)) {
    throw createError({
      statusCode: 409,
      statusMessage: "Ce rapport n'est plus modifiable."
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

  return prisma.progressReport.update({
    where: { id: report.id },
    data: {
      title,
      body,
      difficulties: difficulties ?? null,
      learnings: learnings ?? null,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd)
    }
  })
})
