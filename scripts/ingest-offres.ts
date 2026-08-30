// Ingestion quotidienne des offres d'alternance (ADR-0003).
//
// Exécution : `node scripts/ingest-offres.ts` (type stripping natif de
// Node ≥ 22, sans flag ni tsx) — en prod via un Schedule Job Dokploy
// (`docker exec`, cron `30 3 * * *` UTC), en local avec le `.env` du dépôt
// (chargé automatiquement si `DATABASE_URL` est absent de l'environnement).
//
// Variables d'environnement :
//   DATABASE_URL             (requis)  connexion PostgreSQL
//   LBA_API_KEY              (prod)    jeton Bearer de l'API Apprentissage
//   LBA_EXPORT_URL_OVERRIDE  (option)  URL ou fichier local remplaçant l'appel
//                                      /job/v1/export (tests, secours)
//
// Déroulé par source (échec par source, jamais de crash global) :
//   1. verrou anti-concurrence via ScrapeRun `en_cours` (< 2 h) ;
//   2. un ScrapeRun par source : créé `en_cours`, complété (statut, compteurs,
//      erreurs, finishedAt) à la fin ;
//   3. collect() en streaming → upsert idempotent (dédup url / dedupHash) ;
//   4. expiration (ADR-0002) appliquée SEULEMENT après un run réussi.
// Code de sortie : 1 si au moins une source a échoué, 0 sinon.

import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { OffreStatut, ScrapeRunStatut } from '../shared/utils/enums.ts'
import { OFFRE_EXPIRATION_JOURS } from '../shared/utils/offres.ts'
import type { SourceIngestion } from './ingest/types.ts'
import { upsertOffre, type CompteursUpsert } from './ingest/upsert.ts'
import { sourceLaBonneAlternance } from './ingest/sources/la-bonne-alternance.ts'

/** Un ScrapeRun `en_cours` plus jeune que ce délai bloque un nouveau run de la même source. */
const VERROU_MAX_AGE_MS = 2 * 60 * 60 * 1000
const JOUR_MS = 86_400_000
/** Taille des lots d'ids pour l'expiration des offres déclarées mortes par le payload. */
const LOT_EXPIRATION = 1_000

const SOURCES: SourceIngestion[] = [sourceLaBonneAlternance]

function log(msg: string): void {
  console.log(`[${new Date().toISOString()}] ${msg}`)
}

function messageErreur(erreur: unknown): string {
  return erreur instanceof Error ? erreur.message : String(erreur)
}

// ─────────────────────────── Environnement / Prisma ───────────────────────────

function chargerEnv(): void {
  if (process.env.DATABASE_URL) return
  try {
    // `.env` à la racine du dépôt (voisin de scripts/), quel que soit le cwd.
    process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)))
    log('Variables chargées depuis .env (DATABASE_URL absent de l\'environnement)')
  } catch {
    // Pas de .env : l'environnement doit alors fournir DATABASE_URL (cas conteneur).
  }
}

function creerPrisma(): PrismaClient {
  // Mêmes options que `server/utils/prisma.ts`, mais instance propre : le
  // singleton Nitro (globalThis) n'est pas réutilisable hors contexte Nuxt.
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL manquant (environnement ou .env à la racine du dépôt)')
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

// ─────────────────────────── Verrou anti-concurrence ───────────────────────────

/**
 * Vrai si un run `en_cours` de moins de 2 h existe pour la source (une autre
 * exécution travaille : on refuse de démarrer celle-ci, sans la compter en
 * échec). Un run `en_cours` plus vieux est un crash antérieur : marqué
 * `erreur`, et le nouveau run démarre (ADR-0003).
 */
async function verrouille(prisma: PrismaClient, source: SourceIngestion['source']): Promise<boolean> {
  const seuil = new Date(Date.now() - VERROU_MAX_AGE_MS)

  const perimes = await prisma.scrapeRun.updateMany({
    where: { source, statut: ScrapeRunStatut.en_cours, startedAt: { lt: seuil } },
    data: {
      statut: ScrapeRunStatut.erreur,
      finishedAt: new Date(),
      erreurs: [{ message: 'Run en_cours depuis plus de 2 h, marqué en erreur par le run suivant (crash antérieur probable).' }]
    }
  })
  if (perimes.count > 0) {
    log(`[${source}] ${perimes.count} run(s) en_cours périmé(s) (> 2 h) marqué(s) en erreur`)
  }

  const actif = await prisma.scrapeRun.findFirst({
    where: { source, statut: ScrapeRunStatut.en_cours },
    select: { id: true, startedAt: true }
  })
  if (actif) {
    log(`[${source}] Run ${actif.id} déjà en cours depuis ${actif.startedAt.toISOString()} (< 2 h) : source sautée`)
    return true
  }
  return false
}

// ─────────────────────────── Expiration (après run réussi) ───────────────────────────

/**
 * Passe `expiree` les offres de la source (ADR-0002) : non revues depuis
 * `OFFRE_EXPIRATION_JOURS` jours, ou déclarées mortes par le payload du jour
 * (Filled/Cancelled), ou dont la date d'expiration est dépassée. Renvoie le
 * nombre d'offres expirées. Appelée UNIQUEMENT après un run réussi — un dump
 * illisible ne doit pas faire expirer tout le stock.
 */
async function expirerOffres(
  prisma: PrismaClient,
  source: SourceIngestion['source'],
  idsMortes: string[],
  now: Date
): Promise<number> {
  let expirees = 0

  // 1. Offres déclarées mortes par le payload du dump (Filled/Cancelled ou
  //    expiration dépassée), repérées pendant l'upsert — par lots d'ids.
  for (let i = 0; i < idsMortes.length; i += LOT_EXPIRATION) {
    const lot = idsMortes.slice(i, i + LOT_EXPIRATION)
    const res = await prisma.offre.updateMany({
      where: { id: { in: lot }, statut: OffreStatut.active },
      data: { statut: OffreStatut.expiree }
    })
    expirees += res.count
  }

  // 2. Date d'expiration dépassée (offres du stock, même hors dump du jour).
  const parDate = await prisma.offre.updateMany({
    where: {
      statut: OffreStatut.active,
      sources: { some: { source } },
      dateExpiration: { lt: now }
    },
    data: { statut: OffreStatut.expiree }
  })
  expirees += parDate.count

  // 3. Non revues depuis OFFRE_EXPIRATION_JOURS jours (le dump est complet et
  //    quotidien : une offre absente 3 dumps consécutifs est morte).
  const seuilLastSeen = new Date(now.getTime() - OFFRE_EXPIRATION_JOURS * JOUR_MS)
  const parAbsence = await prisma.offre.updateMany({
    where: {
      statut: OffreStatut.active,
      sources: { some: { source } },
      lastSeen: { lt: seuilLastSeen }
    },
    data: { statut: OffreStatut.expiree }
  })
  expirees += parAbsence.count

  return expirees
}

// ─────────────────────────── Ingestion d'une source ───────────────────────────

async function ingererSource(prisma: PrismaClient, ingestion: SourceIngestion): Promise<boolean> {
  const { source } = ingestion
  const logSource = (msg: string): void => log(`[${source}] ${msg}`)

  if (await verrouille(prisma, source)) return true

  const run = await prisma.scrapeRun.create({
    data: { source, statut: ScrapeRunStatut.en_cours },
    select: { id: true }
  })
  logSource(`ScrapeRun ${run.id} démarré`)

  const compteurs: CompteursUpsert = { vues: 0, creees: 0, maj: 0 }
  const idsMortes: string[] = []

  try {
    for await (const offre of ingestion.collect({ log: logSource })) {
      const now = new Date()
      const resultat = await upsertOffre(prisma, source, offre, now)
      compteurs.vues++
      if (resultat.action === 'creee') compteurs.creees++
      else compteurs.maj++
      if (resultat.morte) idsMortes.push(resultat.offreId)
      if (compteurs.vues % 10_000 === 0) {
        logSource(`${compteurs.vues} offres traitées (${compteurs.creees} créées, ${compteurs.maj} mises à jour)…`)
      }
    }

    // Expiration APRÈS le parcours complet du dump : le run est réussi.
    const offresExpirees = await expirerOffres(prisma, source, idsMortes, new Date())

    await prisma.scrapeRun.update({
      where: { id: run.id },
      data: {
        statut: ScrapeRunStatut.succes,
        finishedAt: new Date(),
        pagesVues: 1, // un dump (fichier) traité par run pour cette v1
        offresVues: compteurs.vues,
        offresCreees: compteurs.creees,
        offresMaj: compteurs.maj,
        offresExpirees
      }
    })
    logSource(`ScrapeRun ${run.id} réussi : ${compteurs.vues} vues, ${compteurs.creees} créées, ${compteurs.maj} mises à jour, ${offresExpirees} expirées`)
    return true
  } catch (erreur) {
    const message = messageErreur(erreur)
    logSource(`ÉCHEC : ${message}`)
    // L'expiration n'est PAS appliquée : un dump illisible ne doit pas faire
    // expirer le stock. Les upserts déjà réalisés restent (idempotents).
    await prisma.scrapeRun.update({
      where: { id: run.id },
      data: {
        statut: ScrapeRunStatut.erreur,
        finishedAt: new Date(),
        offresVues: compteurs.vues,
        offresCreees: compteurs.creees,
        offresMaj: compteurs.maj,
        erreurs: [{ message, contexte: `après ${compteurs.vues} offre(s) traitée(s)` }]
      }
    }).catch((e: unknown) => logSource(`Impossible de clore le ScrapeRun ${run.id} : ${messageErreur(e)}`))
    return false
  }
}

// ─────────────────────────── Point d'entrée ───────────────────────────

async function main(): Promise<void> {
  chargerEnv()
  const prisma = creerPrisma()
  let echec = false

  log(`Ingestion des offres — ${SOURCES.length} source(s)`)
  try {
    for (const ingestion of SOURCES) {
      // try/catch par source : une source en échec ne bloque pas les suivantes.
      try {
        if (!await ingererSource(prisma, ingestion)) echec = true
      } catch (erreur) {
        // Erreur hors ScrapeRun (création du run impossible, etc.).
        log(`[${ingestion.source}] ÉCHEC hors run : ${messageErreur(erreur)}`)
        echec = true
      }
    }
  } finally {
    await prisma.$disconnect()
  }

  log(echec ? 'Terminé avec au moins une source en échec (exit 1)' : 'Terminé sans échec (exit 0)')
  process.exitCode = echec ? 1 : 0
}

await main()
