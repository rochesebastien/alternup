import { z } from 'zod'
import { requireAuth } from '~/server/utils/require-role'
import { loadReportVisibleTo } from '~/server/utils/reports'
import { signableReportOf, signatureBlockOf } from '~/server/utils/signatures'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })
  }

  const report = await loadReportVisibleTo(idp.data, user)
  const signatures = await signatureBlockOf(signableReportOf(report))

  return { ...report, signatures }
})
