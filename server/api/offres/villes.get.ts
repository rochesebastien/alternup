import type { Prisma } from '@prisma/client'
import { OffreStatut, Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { offreVillesQuerySchema, type OffreVilleOption } from '~/shared/utils/offres'

// Liste déroulante « ville » du filtre de la page offres (ADR-0004) : les
// couples (ville, codePostal) réellement présents en base sur le stock actif,
// groupés par fréquence décroissante. Mêmes rôles que GET /api/offres (lecture
// ouverte au tuteur). Route statique `villes` prioritaire sur `[id]/` (radix
// Nitro), comme `stats.get.ts`.
export default defineEventHandler(async (event) => {
  await requireRole(event, Role.Alternant, Role.Stagiaire, Role.Tutor)

  const parsed = offreVillesQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Filtres invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }
  const { q } = parsed.data

  const where: Prisma.OffreWhereInput = {
    statut: OffreStatut.active,
    ville: { not: null },
    codePostal: { not: null }
  }
  if (q) {
    where.OR = [
      { ville: { startsWith: q, mode: 'insensitive' } },
      { codePostal: { startsWith: q } }
    ]
  }

  const groupes = await prisma.offre.groupBy({
    by: ['ville', 'codePostal'],
    where,
    // `_count.id` (et non `_all`, absent du type d'orderBy généré) — id est
    // NOT NULL donc équivalent à un COUNT(*) par groupe.
    _count: { id: true },
    orderBy: [{ _count: { id: 'desc' } }, { ville: 'asc' }],
    take: 15
  })

  const items: OffreVilleOption[] = groupes.map((g) => ({
    // `ville`/`codePostal` non null par construction du `where` ci-dessus.
    ville: g.ville as string,
    codePostal: g.codePostal as string,
    total: g._count.id
  }))

  return { items }
})
