// Ingestion quotidienne des offres d'alternance (ADR-0003).
//
// Exécution : `node scripts/ingest-offres.ts` (type stripping natif de
// Node ≥ 22.18, sans flag ni tsx — `engines` du package.json aligné) — en prod
// via un Schedule Job Dokploy (`docker exec`, cron `30 3 * * *` UTC), en local
// avec le `.env` du dépôt (chargé automatiquement si `DATABASE_URL` est absent
// de l'environnement).
//
// NB : Node émet un warning bénin `MODULE_TYPELESS_PACKAGE_JSON` (le
// package.json du dépôt n'a pas de champ `type`, imposé par l'outillage Nuxt).
// Renommer scripts/ en `.mts` ne le supprimerait pas : il viendrait alors des
// modules partagés (`shared/`, `server/utils/`), qui doivent rester en `.ts`
// pour Nuxt. Assumé et sans effet fonctionnel.
//
// Variables d'environnement :
//   DATABASE_URL             (requis)  connexion PostgreSQL
//   LBA_API_KEY              (prod)    jeton Bearer de l'API Apprentissage
//   LBA_EXPORT_URL_OVERRIDE  (option)  URL ou fichier local remplaçant l'appel
//                                      /job/v1/export (tests, secours)
//   ALERTE_WEBHOOK_URL       (option)  URL POSTée (JSON) quand au moins une
//                                      source échoue ; rien si absente
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
import type { OffreNormalisee, SourceIngestion } from './ingest/types.ts'
import { TAILLE_LOT_UPSERT, upsertLot } from './ingest/upsert.ts'
import { sourceLaBonneAlternance } from './ingest/sources/la-bonne-alternance.ts'

/**
 * Verrou anti-concurrence : un ScrapeRun `en_cours` plus jeune que ce délai
 * bloque un nouveau run de la même source ; plus vieux, il est considéré comme
 * un crash antérieur et marqué `erreur`. 2 h est très large pour un run
 * national avec les upserts par lots (quelques minutes attendues), mais couvre
 * un réseau ou une base dégradés sans risquer deux ingestions simultanées.
 */
const VERROU_MAX_AGE_MS = 2 * 60 * 60 * 1000
const JOUR_MS = 86_400_000
/** Taille des lots d'ids pour l'expiration des offres déclarées mortes par le payload. */
const LOT_EXPIRATION = 1_000
/**
 * Garde anti-expiration massive : si un run « réussi » a vu moins de
 * `SEUIL_EXPIRATION_VUES` × (stock actif de la source au démarrage) offres
 * — dump vide ou anormalement amputé —, l'expiration est sautée (avec un
 * avertissement dans `ScrapeRun.erreurs`) plutôt que d'expirer tout le stock.
 */
const SEUIL_EXPIRATION_VUES = 0.5
/** Timeout de l'alerte webhook : court, pour ne jamais retarder la fin du script. */
const ALERTE_TIMEOUT_MS = 10_000
/** Troncature des messages d'erreur envoyés au webhook (payload minimal). */
const ALERTE_MESSAGE_MAX = 500

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

// ─────────────────────────── Alerte d'échec (webhook optionnel) ───────────────────────────

/**
 * POSTe un JSON minimal sur `ALERTE_WEBHOOK_URL` quand au moins une source a
 * échoué. Best-effort strict : timeout court, try/catch — un webhook absent,
 * lent ou en erreur ne doit JAMAIS faire échouer ni retarder le script
 * (l'échec d'envoi est simplement loggé). Rien si la variable est absente.
 */
async function envoyerAlerte(echecs: { source: string, message: string }[]): Promise<void> {
  const url = process.env.ALERTE_WEBHOOK_URL
  if (!url || echecs.length === 0) return
  try {
    const reponse = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: AbortSignal.timeout(ALERTE_TIMEOUT_MS),
      body: JSON.stringify({
        sujet: `[alternup] Ingestion des offres : ${echecs.length} source(s) en échec`,
        sources: echecs.map(e => ({
          source: e.source,
          message: e.message.slice(0, ALERTE_MESSAGE_MAX)
        })),
        date: new Date().toISOString()
      })
    })
    if (!reponse.ok) throw new Error(`réponse HTTP ${reponse.status}`)
    log(`Alerte d'échec envoyée au webhook (${echecs.length} source(s))`)
  } catch (erreur) {
    log(`Échec d'envoi de l'alerte webhook (sans effet sur le run) : ${messageErreur(erreur)}`)
  }
}

// ─────────────────────────── Ingestion d'une source ───────────────────────────

/** Renvoie `null` si la source est passée (ou sautée), sinon le message d'échec. */
async function ingererSource(prisma: PrismaClient, ingestion: SourceIngestion): Promise<string | null> {
  const { source } = ingestion
  const logSource = (msg: string): void => log(`[${source}] ${msg}`)

  if (await verrouille(prisma, source)) return null

  // Stock actif de la source AVANT le run, pour la garde anti-expiration massive.
  const stockActifInitial = await prisma.offre.count({
    where: { statut: OffreStatut.active, sources: { some: { source } } }
  })

  const run = await prisma.scrapeRun.create({
    data: { source, statut: ScrapeRunStatut.en_cours },
    select: { id: true }
  })
  logSource(`ScrapeRun ${run.id} démarré (stock actif : ${stockActifInitial} offre(s))`)

  const compteurs = { vues: 0, creees: 0, maj: 0 }
  const idsMortes: string[] = []
  const lot: OffreNormalisee[] = []

  const traiterLot = async (): Promise<void> => {
    if (lot.length === 0) return
    const contenu = lot.splice(0)
    const resultat = await upsertLot(prisma, source, contenu, new Date())
    compteurs.vues += contenu.length
    compteurs.creees += resultat.creees
    compteurs.maj += resultat.maj
    idsMortes.push(...resultat.idsMortes)
    if (compteurs.vues % 10_000 < contenu.length) {
      logSource(`${compteurs.vues} offres traitées (${compteurs.creees} créées, ${compteurs.maj} mises à jour)…`)
    }
  }

  try {
    for await (const offre of ingestion.collect({ log: logSource })) {
      lot.push(offre)
      if (lot.length >= TAILLE_LOT_UPSERT) await traiterLot()
    }
    await traiterLot()

    // Expiration APRÈS le parcours complet du dump (run réussi), sauf run
    // anormal : dump vide ou couvrant moins de la moitié du stock actif —
    // un dump amputé ne doit pas faire expirer tout le stock 3 jours de suite.
    let offresExpirees = 0
    let avertissements: { message: string }[] | undefined
    const runAnormal = compteurs.vues === 0
      || compteurs.vues < stockActifInitial * SEUIL_EXPIRATION_VUES
    if (runAnormal) {
      const message = `Avertissement : expiration sautée — ${compteurs.vues} offre(s) vue(s) pour un stock actif de ${stockActifInitial} (seuil : ${SEUIL_EXPIRATION_VUES * 100} %). Dump vide ou anormalement amputé ?`
      logSource(message)
      avertissements = [{ message }]
    } else {
      offresExpirees = await expirerOffres(prisma, source, idsMortes, new Date())
    }

    await prisma.scrapeRun.update({
      where: { id: run.id },
      data: {
        statut: ScrapeRunStatut.succes,
        finishedAt: new Date(),
        pagesVues: 1, // un dump (fichier) traité par run pour cette v1
        offresVues: compteurs.vues,
        offresCreees: compteurs.creees,
        offresMaj: compteurs.maj,
        offresExpirees,
        ...(avertissements ? { erreurs: avertissements } : {})
      }
    })
    logSource(`ScrapeRun ${run.id} réussi : ${compteurs.vues} vues, ${compteurs.creees} créées, ${compteurs.maj} mises à jour, ${offresExpirees} expirées${avertissements ? ' (expiration sautée)' : ''}`)
    return null
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
    return message
  }
}

// ─────────────────────────── Point d'entrée ───────────────────────────

async function main(): Promise<void> {
  chargerEnv()
  const prisma = creerPrisma()
  const echecs: { source: string, message: string }[] = []

  log(`Ingestion des offres — ${SOURCES.length} source(s)`)
  try {
    for (const ingestion of SOURCES) {
      // try/catch par source : une source en échec ne bloque pas les suivantes.
      try {
        const echec = await ingererSource(prisma, ingestion)
        if (echec !== null) echecs.push({ source: ingestion.source, message: echec })
      } catch (erreur) {
        // Erreur hors ScrapeRun (création du run impossible, etc.).
        const message = messageErreur(erreur)
        log(`[${ingestion.source}] ÉCHEC hors run : ${message}`)
        echecs.push({ source: ingestion.source, message })
      }
    }
  } finally {
    await prisma.$disconnect()
  }

  await envoyerAlerte(echecs)

  const echec = echecs.length > 0
  log(echec ? 'Terminé avec au moins une source en échec (exit 1)' : 'Terminé sans échec (exit 0)')
  process.exitCode = echec ? 1 : 0
}

await main()
