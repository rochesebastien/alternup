// Contrats du pipeline d'ingestion d'offres (ADR-0003).
//
// Exécuté par le type stripping natif de Node ≥ 22 (`node scripts/ingest-offres.ts`) :
// imports relatifs AVEC extension `.ts`, pas d'alias Nuxt, pas d'`enum` TS runtime.

import type { OffreContratType, OffreSourceType } from '../../shared/utils/enums.ts'

/**
 * Une offre telle que produite par un module source, prête pour l'upsert.
 * Le mapping des champs vers le modèle `Offre` est celui de l'ADR-0002
 * (colonnes normalisées + payload complet dans `raw`).
 */
export interface OffreNormalisee {
  /** Lien de candidature/origine (`apply.url` LBA) — clé de dédup primaire. */
  url: string
  titre: string
  entreprise: string | null
  lieu: string | null
  /** Ville et code postal extraits de `lieu` par `parseLieu` (shared/utils/offres.ts). */
  ville: string | null
  codePostal: string | null
  typeContrat: OffreContratType | null
  niveauDiplome: string | null
  romeCodes: string[]
  datePublication: Date | null
  dateExpiration: Date | null
  /** Payload source complet, non retraité (colonne `Offre.raw`). */
  raw: unknown
  /** Attribution source (`identifier.partner_label` LBA) → ligne `OffreSource`. */
  partnerLabel: string | null
  /** Id de l'offre chez le partenaire (`identifier.partner_job_id` LBA). */
  partnerJobId: string | null
  /** Statut déclaré par la source (`offer.status` LBA : Active/Filled/Cancelled). */
  statutSource: string | null
}

export interface SourceIngestionContext {
  /** Log horodaté, préfixé par la source (stdout → entrée de log Dokploy). */
  log: (msg: string) => void
}

/** Un canal d'ingestion (LBA aujourd'hui ; FT direct, Firecrawl demain). */
export interface SourceIngestion {
  source: OffreSourceType
  /** Télécharge et normalise les offres ; itérable pour parser le dump en streaming. */
  collect(ctx: SourceIngestionContext): AsyncIterable<OffreNormalisee>
}

/** Statuts source déclarant une offre morte (ADR-0002 : `Filled`/`Cancelled`). */
export const STATUTS_SOURCE_MORTS: readonly string[] = ['Filled', 'Cancelled']

/**
 * Vrai si le payload source déclare l'offre morte : statut `Filled`/`Cancelled`
 * ou date d'expiration dépassée (règles d'expiration ADR-0002). Une offre morte
 * n'est jamais réactivée par l'upsert et sera passée `expiree` au terme d'un
 * run réussi de sa source.
 */
export function estMorteSelonSource(offre: OffreNormalisee, now: Date): boolean {
  if (offre.statutSource !== null && STATUTS_SOURCE_MORTS.includes(offre.statutSource)) return true
  return offre.dateExpiration !== null && offre.dateExpiration.getTime() < now.getTime()
}
