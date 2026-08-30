import { Role } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { offreStatutInputSchema } from '~/shared/utils/offres'

// Pose (ou remplace) MON statut de candidature sur une offre : upsert sur la
// PK composite [userId, offreId] (ADR-0002 — revenir en arrière = reposer un
// autre statut, jamais de suppression en v1). `userId` vient de la session.
export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Alternant, Role.Stagiaire)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: "Identifiant d'offre invalide." })
  }

  const parsed = offreStatutInputSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Statut de candidature invalide.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const offre = await prisma.offre.findUnique({
    where: { id: idp.data },
    select: { id: true }
  })
  if (!offre) {
    throw createError({ statusCode: 404, statusMessage: 'Offre introuvable.' })
  }

  return prisma.offreUserStatut.upsert({
    where: { userId_offreId: { userId: user.id, offreId: offre.id } },
    create: { userId: user.id, offreId: offre.id, statut: parsed.data.statut },
    update: { statut: parsed.data.statut }
  })
})
