import { OffreStatut, Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'

/** Fenêtre du graphe « offres par jour » (jours glissants). */
const STATS_JOURS = 14
const DAY_MS = 86_400_000

// Statistiques d'ingestion de la veille d'offres. V1 : consommé par la page
// offres (pas d'espace admin), donc mêmes rôles que la liste. Route statique
// `stats` prioritaire sur le segment dynamique `[id]/` (radix Nitro).
export default defineEventHandler(async (event) => {
  await requireRole(event, Role.Alternant, Role.Stagiaire)

  const since = new Date(Date.now() - STATS_JOURS * DAY_MS)

  const [offresActives, offresParJour, derniersRuns] = await Promise.all([
    prisma.offre.count({ where: { statut: OffreStatut.active } }),
    // Agrégat par jour de première apparition — requête taguée (paramétrée),
    // jamais d'interpolation. `::int` évite la sérialisation BigInt de count().
    prisma.$queryRaw<Array<{ jour: string, total: number }>>`
      SELECT to_char(first_seen::date, 'YYYY-MM-DD') AS jour, count(*)::int AS total
      FROM offres
      WHERE first_seen >= ${since}
      GROUP BY first_seen::date
      ORDER BY jour ASC
    `,
    // Dernier run par source : `distinct` sur la source, trié startedAt desc.
    prisma.scrapeRun.findMany({
      distinct: ['source'],
      orderBy: [{ source: 'asc' }, { startedAt: 'desc' }],
      select: {
        id: true,
        source: true,
        statut: true,
        startedAt: true,
        finishedAt: true,
        pagesVues: true,
        offresVues: true,
        offresCreees: true,
        offresMaj: true,
        offresExpirees: true,
        creditsEstimes: true
      }
    })
  ])

  return { offresActives, offresParJour, derniersRuns }
})
