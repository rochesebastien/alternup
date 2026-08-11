import { z } from 'zod'
import { Prisma, Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { cardPublishSchema } from '~/shared/utils/report-periods'
import { loadPeriodOwnedBy, computeSnapshot } from '~/server/utils/report-cards'
import { learnerIdsOf } from '~/server/utils/network'
import { excerpt, notifyUser } from '~/server/utils/notifications'

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
      statusMessage: "Cet étudiant n'est pas sous votre responsabilité."
    })
  }

  // Cast requis: l'objet snapshot typé n'a pas d'index-signature pour le champ Json Prisma.
  const snapshot = (await computeSnapshot(
    studentId,
    period.startDate,
    period.endDate
  )) as unknown as Prisma.InputJsonValue

  const card = await prisma.reportCard.upsert({
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

  // `/bulletins/[id]` est la page de PÉRIODE, réservée au tuteur. L'étudiant est
  // envoyé sur la fiche du bulletin, qu'il peut consulter, signer et imprimer.
  await notifyUser(studentId, {
    type: 'bulletin_publie',
    title: `Bulletin publié : ${period.label}`,
    body: generalComment
      ? excerpt(generalComment)
      : 'Votre bulletin est disponible et peut être signé.',
    link: `/bulletins/carte/${card.id}`
  })

  return card
})
