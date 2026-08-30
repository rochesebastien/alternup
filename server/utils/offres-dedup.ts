// Hash de déduplication des offres (ADR-0002).
//
// Séparé de `shared/utils/offres.ts` volontairement : `node:crypto` n'existe
// pas dans le navigateur, et `shared/` est importé par les pages — bundlé côté
// client, cet import casserait l'hydratation (même famille d'incident que
// `@prisma/client`, voir `shared/utils/enums.ts`). Sous `server/`, Nuxt
// garantit structurellement que ce module ne rejoint jamais le bundle client.
// Le script d'ingestion (ADR-0003) l'importera aussi, hors contexte Nitro.

import { createHash } from 'node:crypto'
import { normalizeForDedup } from '~/shared/utils/offres'

/**
 * Clé `Offre.dedupHash` : sha256 hexadécimal du triplet (titre, entreprise,
 * lieu) normalisé par `normalizeForDedup`. Seul le script d'ingestion écrit
 * cette colonne (discipline actée dans l'ADR-0002).
 */
export function dedupHashOf(
  titre: string,
  entreprise: string | null | undefined,
  lieu: string | null | undefined
): string {
  return createHash('sha256').update(normalizeForDedup(titre, entreprise, lieu)).digest('hex')
}
