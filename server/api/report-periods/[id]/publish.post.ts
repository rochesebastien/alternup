import { z } from 'zod'
import { Prisma, Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { cardPublishSchema } from '~/shared/utils/report-periods'
import { loadPeriodOwnedBy, computeSnapshot } from '~/server/utils/report-cards'
import { learnerIdsOf } from '~/server/utils/network'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Tutor)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })
  }

  const period = await loadPeriodOwnedBy(idp.data, user)

  const parsed = cardPublishSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données de publication invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const { studentId, generalComment } = parsed.data

  const ids = await learnerIdsOf(user.id)
  if (!ids.includes(studentId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Cet étudiant n'est pas rattaché à votre réseau."
    })
  }

  // Cast requis: l'objet snapshot typé n'a pas d'index-signature pour le champ Json Prisma.
  const snapshot = (await computeSnapshot(
    studentId,
    period.startDate,
    period.endDate
  )) as unknown as Prisma.InputJsonValue

  return prisma.reportCard.upsert({
    where: { periodId_studentId: { periodId: idp.data, studentId } },
    create: {
      periodId: idp.data,
      studentId,
      generalComment: generalComment ?? null,
      snapshot,
      publishedAt: new Date()
    },
    update: {
      generalComment: generalComment ?? null,
      snapshot,
      publishedAt: new Date()
    }
  })
})
