import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { SignatureDocumentType } from '@prisma/client'
import { loadPeriodOwnedBy } from '~/server/utils/report-cards'
import { learnerIdsOf } from '~/server/utils/network'
import { listSignaturesByDocument } from '~/server/utils/signatures'
import { buildSignatureParties } from '~/shared/utils/signatures'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Tutor)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })
  }

  const period = await loadPeriodOwnedBy(idp.data, user)

  const [cards, ids] = await Promise.all([
    prisma.reportCard.findMany({
      where: { periodId: idp.data },
      include: { student: { select: { id: true, firstName: true, lastName: true } } }
    }),
    learnerIdsOf(user.id)
  ])

  const learners = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true }
  })

  // Tableau de bord des statuts de signature : le tuteur voit d'un coup d'œil
  // qui a signé quoi, sans ouvrir chaque bulletin.
  const signatures = await listSignaturesByDocument(
    SignatureDocumentType.bulletin,
    cards.map((card) => card.id)
  )

  const tutorParty = { id: user.id, name: `${user.firstName} ${user.lastName}` }

  return {
    period,
    cards: cards.map((card) => ({
      ...card,
      signatures: {
        documentType: SignatureDocumentType.bulletin,
        documentId: card.id,
        eligible: card.publishedAt !== null,
        parties: buildSignatureParties(
          {
            tutor: tutorParty,
            student: {
              id: card.student.id,
              name: `${card.student.firstName} ${card.student.lastName}`
            }
          },
          signatures.get(card.id) ?? []
        )
      }
    })),
    learners
  }
})
