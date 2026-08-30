import { Role } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'

// Détail d'une offre : champs normalisés + rattachements sources (attribution
// `partnerLabel`, CGU LBA) + mon statut de candidature. Jamais `raw`.
// Lecture ouverte au tuteur (`monStatut` toujours null pour lui).
export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Alternant, Role.Stagiaire, Role.Tutor)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: "Identifiant d'offre invalide." })
  }

  const offre = await prisma.offre.findUnique({
    where: { id: idp.data },
    select: {
      id: true,
      url: true,
      titre: true,
      entreprise: true,
      lieu: true,
      typeContrat: true,
      niveauDiplome: true,
      romeCodes: true,
      datePublication: true,
      dateExpiration: true,
      sourceOrigine: true,
      statut: true,
      firstSeen: true,
      lastSeen: true,
      sources: {
        select: {
          source: true,
          partnerLabel: true,
          partnerJobId: true,
          firstSeen: true,
          lastSeen: true
        }
      },
      userStatuts: {
        where: { userId: user.id },
        select: { statut: true }
      }
    }
  })
  if (!offre) {
    throw createError({ statusCode: 404, statusMessage: 'Offre introuvable.' })
  }

  const { userStatuts, ...rest } = offre
  return { ...rest, monStatut: userStatuts[0]?.statut ?? null }
})
