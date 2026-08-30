// Veille d'offres d'alternance (ADR-0002 / ADR-0004).
//
// Module PUR : aucune dépendance Prisma / Nuxt / Node, importé à la fois par
// les pages, les handlers Nitro et le futur script d'ingestion (type stripping
// natif de Node ≥ 22 : uniquement des objets `const`, jamais d'`enum` TS
// runtime). Le hash de déduplication (`dedupHashOf`, sha256 via `node:crypto`)
// vit dans `server/utils/offres-dedup.ts` : `node:crypto` n'existe pas dans le
// navigateur et son import ici casserait l'hydratation dès que la page offres
// importerait un schéma de ce fichier (même famille d'incident que
// `@prisma/client`, voir l'en-tête de `shared/utils/enums.ts`).

import { z } from 'zod'
import { CandidatureStatut, OffreContratType } from '~/shared/utils/enums'

// ─────────────────────────── Constantes métier ───────────────────────────

/**
 * Une offre non revue depuis ce nombre de jours au terme d'un run réussi passe
 * `statut: expiree` (le dump LBA est complet et quotidien : une offre absente
 * 3 dumps consécutifs est morte — ADR-0002).
 */
export const OFFRE_EXPIRATION_JOURS = 3

/** Fenêtre du badge « nouveau » : `firstSeen` dans les 7 derniers jours. */
export const OFFRE_NOUVEAUTE_JOURS = 7

/** Taille de page par défaut du tableau d'offres (ADR-0004). */
export const OFFRE_PAGE_SIZE = 25

const DAY_MS = 86_400_000

// ─────────────────────────── Métadonnées d'affichage ───────────────────────────

export interface OffreMeta {
  label: string
  /** Nom d'icône `i-lucide-*`. */
  icon: string
}

export const OFFRE_CONTRAT_META: Record<OffreContratType, OffreMeta> = {
  apprentissage: { label: 'Apprentissage', icon: 'i-lucide-graduation-cap' },
  professionnalisation: { label: 'Professionnalisation', icon: 'i-lucide-briefcase' }
}

export const CANDIDATURE_STATUT_META: Record<CandidatureStatut, OffreMeta> = {
  vue: { label: 'Vue', icon: 'i-lucide-eye' },
  candidate: { label: 'Candidature envoyée', icon: 'i-lucide-send' },
  rejetee: { label: 'Rejetée', icon: 'i-lucide-x' }
}

// ─────────────────────────── Déduplication ───────────────────────────

/**
 * Forme canonique d'un champ ou d'un triplet (titre, entreprise, lieu) pour la
 * déduplication : minuscules, accents supprimés, espaces réduits, trim. Les
 * champs sont joints par `|` pour qu'un déplacement de mot d'un champ à
 * l'autre ne produise pas la même clé. Le sha256 de cette chaîne alimente
 * `Offre.dedupHash` (calculé par `dedupHashOf` côté serveur uniquement).
 */
export function normalizeForDedup(
  titre: string,
  entreprise: string | null | undefined,
  lieu: string | null | undefined
): string {
  return [titre, entreprise ?? '', lieu ?? '']
    .map((part) =>
      part
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
    )
    .join('|')
}

// ─────────────────────────── Badge « nouveau » ───────────────────────────

/**
 * Vrai si l'offre doit porter le badge « nouveau » : vue pour la première fois
 * il y a strictement moins de `OFFRE_NOUVEAUTE_JOURS` jours ET aucun statut de
 * candidature posé par l'utilisateur (ADR-0004 — pas d'état « vu » implicite).
 */
export function estNouvelle(
  offre: { firstSeen: string | Date },
  monStatut: CandidatureStatut | null | undefined,
  now: Date
): boolean {
  if (monStatut) return false
  const firstSeen = offre.firstSeen instanceof Date ? offre.firstSeen : new Date(offre.firstSeen)
  if (Number.isNaN(firstSeen.getTime())) return false
  return now.getTime() - firstSeen.getTime() < OFFRE_NOUVEAUTE_JOURS * DAY_MS
}

// ─────────────────────────── Schémas d'entrée ───────────────────────────

/**
 * Query de `GET /api/offres` — premier pattern paginé `page`/`limit` du dépôt,
 * réponse en enveloppe `{ items, total, page, limit }` (dérogation documentée
 * dans l'ADR-0004). `limit` borné à 100 (anti-extraction).
 */
export const offreListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(OFFRE_PAGE_SIZE),
  typeContrat: z.enum(OffreContratType, { error: 'Type de contrat invalide.' }).optional(),
  /** `contains` insensible sur `Offre.lieu`. */
  lieu: z.string().trim().max(120).optional(),
  /** `contains` insensible sur titre + entreprise. */
  q: z.string().trim().max(120).optional(),
  /** Filtre sur MON statut de candidature (jointure `OffreUserStatut`). */
  statut: z.enum(CandidatureStatut, { error: 'Statut de candidature invalide.' }).optional(),
  // Le paramètre arrive en chaîne dans l'URL : `z.stringbool()` et non
  // `z.coerce.boolean()`, qui aurait transformé `"false"` en `true`.
  inclureExpirees: z.union([z.boolean(), z.stringbool()]).default(false)
})

/** Corps de `POST /api/offres/[id]/statut` (upsert sur la PK `[userId, offreId]`). */
export const offreStatutInputSchema = z.object({
  statut: z.enum(CandidatureStatut, { error: 'Statut de candidature invalide.' })
})

export type OffreListQuery = z.infer<typeof offreListQuerySchema>
export type OffreStatutInput = z.input<typeof offreStatutInputSchema>
