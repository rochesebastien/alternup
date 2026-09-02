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
// Lecture ouverte au tuteur (consultation pure sur /tuteur/offres) : son
// `monStatut` est toujours null et seul POST /statut reste réservé aux
// apprenants.
export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Alternant, Role.Stagiaire, Role.Tutor)

  const parsed = offreListQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Filtres invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }
  const { page, limit, typeContrat, lieu, codePostal, dateDebut, dateFin, q, statut, inclureExpirees } = parsed.data

  const where: Prisma.OffreWhereInput = {}
  // Fraîcheur (ADR-0002) : les offres expirées sont exclues par défaut,
  // `inclureExpirees` les réintègre (marquées côté front via `statut`).
  if (!inclureExpirees) where.statut = OffreStatut.active
  if (typeContrat) where.typeContrat = typeContrat
  if (lieu) where.lieu = { contains: lieu, mode: 'insensitive' }
  // Filtre exact (liste déroulante alimentée par GET /api/offres/villes, pas de `contains`).
  if (codePostal) where.codePostal = codePostal
  // `q` et la plage de dates sont chacun un OR interne (deux champs, ou deux
  // cas datePublication/firstSeen) : combinés via `AND` pour ne jamais se
  // télescoper avec le `where.OR` de l'autre filtre.
  const andClauses: Prisma.OffreWhereInput[] = []
  if (q) {
    andClauses.push({
      OR: [
        { titre: { contains: q, mode: 'insensitive' } },
        { entreprise: { contains: q, mode: 'insensitive' } }
      ]
    })
  }
  // Plage de dates sur `datePublication` (borne haute exclusive, lendemain à
  // minuit UTC) ; une offre sans datePublication (payload source incomplet)
  // retombe sur `firstSeen` pour rester filtrable.
  if (dateDebut || dateFin) {
    const debut = dateDebut ? new Date(`${dateDebut}T00:00:00.000Z`) : undefined
    // Borne exclusive du lendemain : `dateFin` désigne un jour inclus dans son entier.
    const fin = dateFin ? new Date(new Date(`${dateFin}T00:00:00.000Z`).getTime() + 86_400_000) : undefined
    const plage: Prisma.DateTimeFilter = {}
    if (debut) plage.gte = debut
    if (fin) plage.lt = fin
    andClauses.push({
      OR: [
        { datePublication: plage },
        { datePublication: null, firstSeen: plage }
      ]
    })
  }
  if (andClauses.length > 0) where.AND = andClauses
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
