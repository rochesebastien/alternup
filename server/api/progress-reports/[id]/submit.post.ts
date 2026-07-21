import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { loadReportVisibleTo } from '~/server/utils/reports'
import { canTransition } from '~/shared/utils/progress-reports'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })
  }

  const report = await loadReportVisibleTo(idp.data, user)
  if (report.studentId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  if (!canTransition(report.status, 'soumis')) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Transition non autorisée.'
    })
  }

  return prisma.progressReport.update({
    where: { id: report.id },
    data: { status: 'soumis', submittedAt: new Date() }
  })
})
