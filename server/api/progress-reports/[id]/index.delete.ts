import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { loadReportVisibleTo } from '~/server/utils/reports'

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
  if (report.status !== 'brouillon') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Seul un brouillon peut être supprimé.'
    })
  }

  await prisma.progressReport.deleteMany({
    where: { id: report.id, studentId: user.id }
  })

  return { ok: true }
})
