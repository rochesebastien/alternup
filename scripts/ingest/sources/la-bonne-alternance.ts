// Source d'ingestion « La Bonne Alternance » (ADR-0003, rapport de découverte
// `docs/plans/discovery/d-la-bonne-alternance.md`).
//
// v1 : dump JSON complet quotidien `GET /job/v1/export` (régénéré à 3h00 Paris).
// L'appel API (Bearer `LBA_API_KEY`) renvoie une URL S3 présignée valable
// 2 minutes, téléchargée immédiatement puis parsée en streaming (le dump couvre
// toute la France — voir `../json-array-stream.ts`).
//
// `LBA_EXPORT_URL_OVERRIDE` (URL http(s) ou chemin de fichier local) court-
// circuite l'appel API : c'est à la fois le mécanisme de test local (fixture
// `tests/fixtures/lba-export-sample.json`) et la roue de secours si l'endpoint
// `/export` était indisponible alors qu'un miroir du dump existe.

import { createReadStream } from 'node:fs'
import { OffreContratType, OffreSourceType } from '../../../shared/utils/enums.ts'
import { parseJsonArrayStream } from '../json-array-stream.ts'
import type { OffreNormalisee, SourceIngestion, SourceIngestionContext } from '../types.ts'

export const LBA_EXPORT_ENDPOINT = 'https://api.apprentissage.beta.gouv.fr/api/job/v1/export'

/** Timeout de l'appel API `/job/v1/export` (petite réponse JSON). */
const TIMEOUT_API_MS = 60_000
/**
 * Timeout global du téléchargement/streaming du dump (plusieurs centaines de
 * Mo) : l'AbortSignal couvre aussi la consommation du body — un stream figé
 * fait échouer le run (ScrapeRun `erreur`) au lieu de laisser un process zombie.
 */
const TIMEOUT_DUMP_MS = 30 * 60_000

/** `contract.type` LBA → enum `OffreContratType` (garde-fou : tout le reste est filtré). */
const LBA_CONTRAT_VERS_TYPE: Record<string, OffreContratType> = {
  Apprentissage: OffreContratType.apprentissage,
  Professionnalisation: OffreContratType.professionnalisation
}

// ─────────────────────────── Accès tolérant au payload ───────────────────────────
// Le dump est une donnée externe : accès défensifs, jamais de crash sur une
// entrée hors format — l'entrée est simplement écartée (ou le champ mis à null).

function objet(valeur: unknown): Record<string, unknown> | null {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
    ? (valeur as Record<string, unknown>)
    : null
}

function chaine(valeur: unknown): string | null {
  return typeof valeur === 'string' && valeur.trim() !== '' ? valeur.trim() : null
}

function date(valeur: unknown): Date | null {
  if (typeof valeur !== 'string' || valeur === '') return null
  const d = new Date(valeur)
  return Number.isNaN(d.getTime()) ? null : d
}

// ─────────────────────────── Mapping (pur, testé) ───────────────────────────

/**
 * Mappe une entrée du dump LBA (`JobOfferRead`) vers `OffreNormalisee`
 * (correspondances champ à champ de l'ADR-0002 / rapport D). Renvoie `null`
 * pour une entrée à écarter : contrat hors alternance (garde-fou), ou sans
 * `apply.url` / `offer.title` (clé de dédup et champ requis du modèle).
 *
 * Fonction PURE, exportée pour `tests/shared/ingest-lba.test.ts`.
 */
export function mapLbaJob(entree: unknown): OffreNormalisee | null {
  const job = objet(entree)
  if (!job) return null

  const identifier = objet(job.identifier)
  const workplace = objet(job.workplace)
  const location = objet(workplace?.location)
  const apply = objet(job.apply)
  const contract = objet(job.contract)
  const offer = objet(job.offer)
  const targetDiploma = objet(offer?.target_diploma)
  const publication = objet(offer?.publication)

  // Garde-fou périmètre : alternance uniquement (toujours vrai côté LBA, ADR-0003).
  const typesContrat = Array.isArray(contract?.type) ? contract.type : []
  const typeContrat = typesContrat
    .map((t) => (typeof t === 'string' ? LBA_CONTRAT_VERS_TYPE[t] : undefined))
    .find((t) => t !== undefined)
  if (typeContrat === undefined) return null

  const url = chaine(apply?.url)
  const titre = chaine(offer?.title)
  if (url === null || titre === null) return null

  const niveauDiplome = typeof targetDiploma?.level === 'number'
    ? String(targetDiploma.level)
    : chaine(targetDiploma?.level)

  return {
    url,
    titre,
    entreprise: chaine(workplace?.name) ?? chaine(workplace?.legal_name),
    lieu: chaine(location?.address),
    typeContrat,
    niveauDiplome,
    romeCodes: Array.isArray(offer?.rome_codes)
      ? offer.rome_codes.filter((code): code is string => typeof code === 'string')
      : [],
    datePublication: date(publication?.creation),
    dateExpiration: date(publication?.expiration),
    raw: entree,
    partnerLabel: chaine(identifier?.partner_label),
    partnerJobId: chaine(identifier?.partner_job_id),
    statutSource: chaine(offer?.status)
  }
}

// ─────────────────────────── Ouverture du flux ───────────────────────────

async function telechargerFlux(url: string): Promise<AsyncIterable<Uint8Array>> {
  const reponse = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_DUMP_MS) })
  if (!reponse.ok || reponse.body === null) {
    throw new Error(`Téléchargement du dump LBA : HTTP ${reponse.status} sur ${url.split('?')[0]}`)
  }
  return reponse.body
}

async function ouvrirFluxExport(log: (msg: string) => void): Promise<AsyncIterable<Uint8Array>> {
  const override = process.env.LBA_EXPORT_URL_OVERRIDE
  if (override) {
    if (/^https?:\/\//i.test(override)) {
      log(`LBA_EXPORT_URL_OVERRIDE : téléchargement direct de ${override}`)
      return telechargerFlux(override)
    }
    log(`LBA_EXPORT_URL_OVERRIDE : lecture du fichier local ${override}`)
    return createReadStream(override)
  }

  const cle = process.env.LBA_API_KEY
  if (!cle) {
    throw new Error('LBA_API_KEY manquante : impossible d\'appeler /job/v1/export (rapport D — jeton Bearer requis)')
  }

  const reponse = await fetch(LBA_EXPORT_ENDPOINT, {
    headers: { authorization: `Bearer ${cle}` },
    signal: AbortSignal.timeout(TIMEOUT_API_MS)
  })
  if (!reponse.ok) {
    throw new Error(`GET /job/v1/export : HTTP ${reponse.status}`)
  }
  const corps = (await reponse.json()) as { url?: unknown, lastUpdate?: unknown }
  if (typeof corps.url !== 'string' || corps.url === '') {
    throw new Error('GET /job/v1/export : réponse sans champ `url` (URL S3 présignée attendue)')
  }
  // L'URL présignée n'est valable que 2 minutes : téléchargement immédiat.
  log(`Export LBA généré le ${typeof corps.lastUpdate === 'string' ? corps.lastUpdate : '?'} — téléchargement immédiat (URL présignée valable 2 min)`)
  return telechargerFlux(corps.url)
}

// ─────────────────────────── Source ───────────────────────────

export const sourceLaBonneAlternance: SourceIngestion = {
  source: OffreSourceType.la_bonne_alternance,

  async * collect(ctx: SourceIngestionContext): AsyncIterable<OffreNormalisee> {
    const flux = await ouvrirFluxExport(ctx.log)
    let lues = 0
    let retenues = 0
    for await (const entree of parseJsonArrayStream(flux)) {
      lues++
      if (lues % 50_000 === 0) ctx.log(`${lues} entrées lues…`)
      const offre = mapLbaJob(entree)
      if (offre === null) continue
      retenues++
      yield offre
    }
    ctx.log(`Dump parcouru : ${lues} entrées lues, ${retenues} offres d'alternance retenues`)
  }
}
