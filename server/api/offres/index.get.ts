import type { Prisma } from '@prisma/client'
import { OffreStatut, Role, ScrapeRunStatut } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { estNouvelle, offreListQuerySchema } from '~/shared/utils/offres'

// Liste filtrée/paginée des offres (ADR-0004). Premier pattern `page`/`limit`
// du dépôt : réponse en enveloppe `{ items, total, page, limit, lastSync }`
// (dérogation documentée — le `total` est indispensable à UPagination, le
// `lastSync` à l'encart d'attribution LBA). `raw` n'est jamais renvoyé.
export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Alternant, Role.Stagiaire)

  const parsed = offreListQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Filtres invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }
  const { page, limit, typeContrat, lieu, q, statut, inclureExpirees } = parsed.data

  const where: Prisma.OffreWhereInput = {}
  // Fraîcheur (ADR-0002) : les offres expirées sont exclues par défaut,
  // `inclureExpirees` les réintègre (marquées côté front via `statut`).
  if (!inclureExpirees) where.statut = OffreStatut.active
  if (typeContrat) where.typeContrat = typeContrat
  if (lieu) where.lieu = { contains: lieu, mode: 'insensitive' }
  if (q) {
    where.OR = [
      { titre: { contains: q, mode: 'insensitive' } },
      { entreprise: { contains: q, mode: 'insensitive' } }
    ]
  }
  // Filtre sur MON statut de candidature : jointure toujours bornée au user de session.
  if (statut) where.userStatuts = { some: { userId: user.id, statut } }

  const [rows, total, lastRun] = await Promise.all([
    prisma.offre.findMany({
      where,
      // Sélection explicite : ni `raw` (payload source volumineux) ni `dedupHash`.
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
        statut: true,
        firstSeen: true,
        userStatuts: {
          where: { userId: user.id },
          select: { statut: true }
        }
      },
      orderBy: [
        { datePublication: { sort: 'desc', nulls: 'last' } },
        { firstSeen: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.offre.count({ where }),
    prisma.scrapeRun.findFirst({
      where: { statut: ScrapeRunStatut.succes },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true }
    })
  ])

  const now = new Date()
  const items = rows.map(({ userStatuts, ...offre }) => {
    const monStatut = userStatuts[0]?.statut ?? null
    return { ...offre, monStatut, nouvelle: estNouvelle(offre, monStatut, now) }
  })

  return { items, total, page, limit, lastSync: lastRun?.startedAt ?? null }
})
