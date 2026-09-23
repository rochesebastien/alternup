import { Role } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { offreDetailFromRaw, type OffreDetailResponse } from '~/shared/utils/offre-detail'
import { plainText } from '~/shared/utils/rich-text'

// Détail d'une offre (page `/…/offres/[id]`) : champs normalisés + toutes les
// informations du payload source, extraites par `offreDetailFromRaw` vers une
// vue typée (`detail`). `raw` lui-même n'est jamais renvoyé : le format du dump
// peut évoluer, la vue exposée au client non. Lecture ouverte au tuteur
// (`monStatut` toujours null pour lui).
export default defineEventHandler(async (event): Promise<OffreDetailResponse> => {
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
      dureeMois: true,
      romeCodes: true,
      datePublication: true,
      dateExpiration: true,
      statut: true,
      firstSeen: true,
      lastSeen: true,
      raw: true,
      userStatuts: {
        where: { userId: user.id },
        select: { statut: true }
      }
    }
  })
  if (!offre) {
    throw createError({ statusCode: 404, statusMessage: 'Offre introuvable.' })
  }

  const { userStatuts, raw, datePublication, dateExpiration, firstSeen, lastSeen, ...rest } = offre
  return {
    ...rest,
    // Entités HTML éventuelles de la source (`&amp;`…) décodées pour l'affichage.
    titre: plainText(rest.titre),
    entreprise: rest.entreprise ? plainText(rest.entreprise) : null,
    lieu: rest.lieu ? plainText(rest.lieu) : null,
    datePublication: datePublication?.toISOString() ?? null,
    dateExpiration: dateExpiration?.toISOString() ?? null,
    firstSeen: firstSeen.toISOString(),
    lastSeen: lastSeen.toISOString(),
    monStatut: userStatuts[0]?.statut ?? null,
    detail: offreDetailFromRaw(raw)
  }
})
