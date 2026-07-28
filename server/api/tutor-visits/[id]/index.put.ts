import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { loadVisitOwnedBy } from '~/server/utils/tutor-visits'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { visitUpdateSchema } from '~/shared/utils/tutor-visits'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Tutor)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide' })
  }

  await loadVisitOwnedBy(idp.data, user)

  const parsed = visitUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données de visite invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const { scheduledAt, mode, location, status, summary, nextSteps } = parsed.data

  const data: Prisma.TutorVisitUpdateInput = {}
  if (scheduledAt !== undefined) data.scheduledAt = new Date(scheduledAt)
  if (mode !== undefined) data.mode = mode
  if (location !== undefined) data.location = location
  if (status !== undefined) data.status = status
  if (summary !== undefined) data.summary = summary
  if (nextSteps !== undefined) data.nextSteps = nextSteps

  return prisma.tutorVisit.update({ where: { id: idp.data }, data })
})
