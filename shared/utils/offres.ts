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
// Import relatif AVEC extension `.ts` (et non l'alias `~/shared/utils/enums`) :
// ce module est importé par le script d'ingestion exécuté via le type stripping
// natif de Node ≥ 22 (`node scripts/ingest-offres.ts`, ADR-0003), qui ne connaît
// ni les alias Nuxt ni la résolution sans extension. Vite/Nitro et vue-tsc
// (`allowImportingTsExtensions` dans tsconfig.json) résolvent aussi cette forme.
import { CandidatureStatut, OffreContratType } from './enums.ts'

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

// ─────────────────────────── Ville / code postal ───────────────────────────

/**
 * Met une ville en casse « Titre » mot par mot : minuscules puis majuscule sur
 * la première lettre de chaque mot, où un mot est délimité par un espace, un
 * tiret ou une apostrophe (« SAINT-DENIS » → « Saint-Denis », « L'ISLE-ADAM »
 * → « L'Isle-Adam »). Les caractères non alphabétiques (chiffres d'un
 * arrondissement, « paris 11e ») restent inchangés.
 */
function toTitleCaseVille(ville: string): string {
  return ville
    .toLowerCase()
    .replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, lettre: string) => sep + lettre.toLocaleUpperCase('fr'))
}

/**
 * Extrait un code postal français (5 chiffres, en mot entier : jamais un
 * fragment d'un nombre plus long) et la ville qui le suit jusqu'à la fin de la
 * chaîne ou la prochaine virgule, depuis l'adresse texte LBA `Offre.lieu`
 * (`workplace.location.address`, ex. « 12 rue de la Roquette, 75011 Paris »,
 * parfois « 75011 PARIS » sans voirie, parfois sans aucun code postal).
 * Fonction PURE, testée dans `tests/shared/offres.test.ts` — le backfill SQL
 * de la migration `offres_ville_code_postal` en est une approximation (voir
 * le commentaire de cette migration pour l'écart).
 */
export function parseLieu(lieu: string | null | undefined): { ville: string | null, codePostal: string | null } {
  if (!lieu) return { ville: null, codePostal: null }
  // `(?<!\d)…(?!\d)` = code postal en mot entier, jamais un fragment d'un
  // numéro de voirie à 5 chiffres ou d'un nombre plus long.
  const match = lieu.match(/(?<!\d)(\d{5})(?!\d)/)
  if (!match || match.index === undefined) return { ville: null, codePostal: null }
  const codePostal = match[1] as string
  const reste = lieu.slice(match.index + codePostal.length)
  const villeBrute = (reste.split(',')[0] ?? '').replace(/\s+/g, ' ').trim()
  return { ville: villeBrute ? toTitleCaseVille(villeBrute) : null, codePostal }
}

/** Libellé d'option du filtre ville : « Paris (75011) ». */
export function formatVilleOption(ville: string | null, codePostal: string | null): string {
  if (ville && codePostal) return `${ville} (${codePostal})`
  return ville ?? codePostal ?? ''
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
  /** Filtre exact sur `Offre.codePostal` (liste déroulante alimentée par `GET /api/offres/villes`). */
  codePostal: z.string().regex(/^\d{5}$/, { error: 'Code postal invalide.' }).optional(),
  /** Bornes (incluses) de `Offre.datePublication`, format `yyyy-MM-dd`. */
  dateDebut: z.iso.date({ error: 'Date de début invalide.' }).optional(),
  dateFin: z.iso.date({ error: 'Date de fin invalide.' }).optional(),
  /** `contains` insensible sur titre + entreprise. */
  q: z.string().trim().max(120).optional(),
  /** Filtre sur MON statut de candidature (jointure `OffreUserStatut`). */
  statut: z.enum(CandidatureStatut, { error: 'Statut de candidature invalide.' }).optional(),
  // Le paramètre arrive en chaîne dans l'URL : `z.stringbool()` et non
  // `z.coerce.boolean()`, qui aurait transformé `"false"` en `true`.
  inclureExpirees: z.union([z.boolean(), z.stringbool()]).default(false)
}).refine(
  (query) => !query.dateDebut || !query.dateFin || query.dateDebut <= query.dateFin,
  { error: 'Filtres invalides.', path: ['dateFin'] }
)

// ─────────────────────────── Filtres de la page (ADR-0004) ───────────────────────────

/**
 * État des filtres de la page offres (refs côté page). Les champs texte et les
 * selects utilisent `''` pour « pas de filtre » (valeur vide d'un `USelect`).
 */
export interface OffreListFilters {
  page: number
  q: string
  lieu: string
  /** Code postal exact (`''` = pas de filtre), choisi dans la liste de `GET /api/offres/villes`. */
  codePostal: string
  /** Bornes de `datePublication`, format `yyyy-MM-dd` (`''` = pas de filtre). */
  dateDebut: string
  dateFin: string
  typeContrat: OffreContratType | ''
  statut: CandidatureStatut | ''
  inclureExpirees: boolean
}

/**
 * Query minimale (sans valeurs par défaut ni champs vides) dérivée des filtres
 * de la page : sert à la fois d'URL partageable (`router.replace`) et de query
 * de `GET /api/offres` (le schéma serveur ré-applique les défauts omis).
 */
export function offreListQueryFrom(filters: OffreListFilters): Record<string, string> {
  const query: Record<string, string> = {}
  if (filters.page > 1) query.page = String(filters.page)
  const q = filters.q.trim()
  if (q) query.q = q
  const lieu = filters.lieu.trim()
  if (lieu) query.lieu = lieu
  if (filters.codePostal) query.codePostal = filters.codePostal
  if (filters.dateDebut) query.dateDebut = filters.dateDebut
  if (filters.dateFin) query.dateFin = filters.dateFin
  if (filters.typeContrat) query.typeContrat = filters.typeContrat
  if (filters.statut) query.statut = filters.statut
  if (filters.inclureExpirees) query.inclureExpirees = 'true'
  return query
}

/**
 * Relit les filtres depuis une query d'URL (arrivée directe sur un lien
 * partagé). Inverse de `offreListQueryFrom` : toute valeur absente ou invalide
 * retombe sur le défaut — jamais d'erreur pour une URL bricolée.
 */
export function offreListFiltersFrom(
  query: Record<string, unknown>
): OffreListFilters {
  const str = (v: unknown): string => (typeof v === 'string' ? v : '')
  const page = Number.parseInt(str(query.page), 10)
  const typeContrat = str(query.typeContrat)
  const statut = str(query.statut)
  const codePostal = str(query.codePostal)
  const dateDebut = str(query.dateDebut)
  const dateFin = str(query.dateFin)
  const dateValide = (v: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v).getTime())
  return {
    page: Number.isInteger(page) && page > 1 ? page : 1,
    q: str(query.q),
    lieu: str(query.lieu),
    codePostal: /^\d{5}$/.test(codePostal) ? codePostal : '',
    dateDebut: dateValide(dateDebut) ? dateDebut : '',
    dateFin: dateValide(dateFin) ? dateFin : '',
    typeContrat: typeContrat in OFFRE_CONTRAT_META ? (typeContrat as OffreContratType) : '',
    statut: statut in CANDIDATURE_STATUT_META ? (statut as CandidatureStatut) : '',
    inclureExpirees: str(query.inclureExpirees) === 'true'
  }
}

/** Corps de `POST /api/offres/[id]/statut` (upsert sur la PK `[userId, offreId]`). */
export const offreStatutInputSchema = z.object({
  statut: z.enum(CandidatureStatut, { error: 'Statut de candidature invalide.' })
})

/** Query de `GET /api/offres/villes` (liste déroulante du filtre ville). */
export const offreVillesQuerySchema = z.object({
  q: z.string().trim().max(60).default('')
})

/** Une option de la liste déroulante « ville » : `total` = nombre d'offres actives à ce couple ville/codePostal. */
export interface OffreVilleOption {
  ville: string
  codePostal: string
  total: number
}

export type OffreListQuery = z.infer<typeof offreListQuerySchema>
export type OffreStatutInput = z.input<typeof offreStatutInputSchema>
export type OffreVillesQuery = z.infer<typeof offreVillesQuerySchema>
