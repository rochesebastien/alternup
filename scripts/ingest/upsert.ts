// Écriture idempotente des offres normalisées, PAR LOTS (règles de dédup ADR-0002).
//
// 1. Conflit sur `url`   → mise à jour lastSeen + champs normalisés + raw,
//                          lastSeen de la ligne `OffreSource` rafraîchi.
// 2. Conflit sur `dedupHash` (même offre vue via une autre URL/source) →
//    PAS de doublon : rattachement d'une ligne `OffreSource` supplémentaire
//    (PK composite (offreId, source)) + lastSeen rafraîchi.
// 3. Sinon → création `Offre` + ligne `OffreSource`.
//
// Attribution (exigence CGU) : `partnerLabel`/`partnerJobId` d'une ligne
// `OffreSource` existante ne sont JAMAIS écrasés — l'attribution de première
// vue est conservée ; on ne fait que compléter un champ encore null.
//
// Performance : un dump national fait plusieurs centaines de milliers de
// lignes. Chaque lot (`TAILLE_LOT_UPSERT` offres) est classé via DEUX
// `findMany` (urls puis hashes), puis écrit en requêtes groupées :
// `createManyAndReturn` pour les nouvelles offres (+ `createMany` de leurs
// lignes `OffreSource`), updates groupés dans une transaction pour les mises à
// jour, `updateMany` pour les lastSeen `OffreSource`. Les conflits internes au
// lot (deux offres du même lot partageant url ou hash) et le TOCTOU résiduel
// (P2002 : une écriture concurrente entre la classification et le createMany)
// retombent sur un chemin unitaire idempotent.
//
// L'upsert ne passe JAMAIS une offre `expiree` (l'expiration n'est appliquée
// qu'au terme d'un run réussi, par l'orchestrateur) ; il se contente de
// réactiver (`statut: active`) une offre revue vivante dans le dump (ADR-0002).

import { Prisma, type PrismaClient } from '@prisma/client'
import { dedupHashOf } from '../../server/utils/offres-dedup.ts'
import { OffreStatut } from '../../shared/utils/enums.ts'
import { estMorteSelonSource, type OffreNormalisee, type SourceIngestion } from './types.ts'

/** Taille des lots d'upsert (2 findMany + ~4 écritures groupées par lot). */
export const TAILLE_LOT_UPSERT = 500

type SourceType = SourceIngestion['source']

export interface ResultatLot {
  creees: number
  maj: number
  /** Ids des offres déclarées mortes par le payload (à expirer après run réussi). */
  idsMortes: string[]
}

interface ItemLot {
  offre: OffreNormalisee
  hash: string
  morte: boolean
}

/** Champs normalisés rafraîchis lors d'une mise à jour par conflit d'`url`. */
function champsNormalises(offre: OffreNormalisee) {
  return {
    titre: offre.titre,
    entreprise: offre.entreprise,
    lieu: offre.lieu,
    ville: offre.ville,
    codePostal: offre.codePostal,
    typeContrat: offre.typeContrat,
    niveauDiplome: offre.niveauDiplome,
    romeCodes: offre.romeCodes,
    datePublication: offre.datePublication,
    dateExpiration: offre.dateExpiration,
    raw: offre.raw as Prisma.InputJsonValue
  }
}

function estConflitUnicite(erreur: unknown): boolean {
  return erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === 'P2002'
}

/**
 * Upsert d'un lot d'offres normalisées. Renvoie les compteurs du lot ;
 * `offres.length` = nombre d'offres vues.
 */
export async function upsertLot(
  prisma: PrismaClient,
  source: SourceType,
  offres: OffreNormalisee[],
  now: Date
): Promise<ResultatLot> {
  const resultat: ResultatLot = { creees: 0, maj: 0, idsMortes: [] }
  if (offres.length === 0) return resultat

  const items: ItemLot[] = offres.map((offre) => ({
    offre,
    hash: dedupHashOf(offre.titre, offre.entreprise, offre.lieu),
    morte: estMorteSelonSource(offre, now)
  }))

  // ── Classification : 2 findMany pour tout le lot ──
  const existantesParUrl = new Map(
    (await prisma.offre.findMany({
      where: { url: { in: items.map((i) => i.offre.url) } },
      select: { id: true, url: true, dedupHash: true }
    })).map((o) => [o.url, o])
  )
  const existantesParHash = new Map(
    (await prisma.offre.findMany({
      where: { dedupHash: { in: items.map((i) => i.hash) } },
      select: { id: true, dedupHash: true }
    })).map((o) => [o.dedupHash, o])
  )

  const majUrl: { item: ItemLot, id: string, ancienHash: string }[] = []
  const majHash: { item: ItemLot, id: string }[] = []
  const creations: ItemLot[] = []
  /** Conflits internes au lot (url/hash déjà pris par une création du même lot) → chemin unitaire. */
  const differes: ItemLot[] = []
  const creationsParUrl = new Map<string, ItemLot>()
  const hashesReserves = new Set<string>()

  for (const item of items) {
    const parUrl = existantesParUrl.get(item.offre.url)
    if (parUrl) {
      majUrl.push({ item, id: parUrl.id, ancienHash: parUrl.dedupHash })
      continue
    }
    if (creationsParUrl.has(item.offre.url)) {
      differes.push(item)
      continue
    }
    const parHash = existantesParHash.get(item.hash)
    if (parHash) {
      majHash.push({ item, id: parHash.id })
      continue
    }
    if (hashesReserves.has(item.hash)) {
      differes.push(item)
      continue
    }
    creations.push(item)
    creationsParUrl.set(item.offre.url, item)
    hashesReserves.add(item.hash)
  }

  // ── Créations groupées ──
  let aRetraiter: ItemLot[] = []
  if (creations.length > 0) {
    try {
      const creees = await prisma.offre.createManyAndReturn({
        data: creations.map((item) => ({
          url: item.offre.url,
          dedupHash: item.hash,
          sourceOrigine: source,
          ...champsNormalises(item.offre),
          firstSeen: now,
          lastSeen: now
        })),
        select: { id: true, url: true }
      })
      await prisma.offreSource.createMany({
        data: creees.map((creee) => {
          const item = creationsParUrl.get(creee.url) as ItemLot
          return {
            offreId: creee.id,
            source,
            partnerLabel: item.offre.partnerLabel,
            partnerJobId: item.offre.partnerJobId,
            firstSeen: now,
            lastSeen: now
          }
        }),
        skipDuplicates: true
      })
      resultat.creees += creees.length
      for (const creee of creees) {
        if ((creationsParUrl.get(creee.url) as ItemLot).morte) resultat.idsMortes.push(creee.id)
      }
    } catch (erreur) {
      // TOCTOU résiduel : une écriture concurrente a créé une url ou un hash du
      // lot entre la classification et le createMany → chaque création est
      // retraitée par le chemin unitaire idempotent (reclassée en conflit url/hash).
      if (!estConflitUnicite(erreur)) throw erreur
      aRetraiter = creations
    }
  }

  // ── Mises à jour groupées (une transaction pour les offres du lot) ──
  const opsOffres: Prisma.PrismaPromise<unknown>[] = []
  const hashesMaj = new Set<string>()
  for (const { item, id, ancienHash } of majUrl) {
    let hash = item.hash
    if (hash !== ancienHash) {
      // Le triplet (titre, entreprise, lieu) a changé : le nouveau hash peut
      // entrer en collision avec une AUTRE offre (contrainte unique) — en base
      // ou dans ce même lot. Cas limite : on conserve alors l'ancien hash
      // plutôt que de faire échouer la ligne, la dédup par URL reste correcte.
      const autre = existantesParHash.get(hash)
      const collision = (autre !== undefined && autre.id !== id)
        || hashesReserves.has(hash)
        || hashesMaj.has(hash)
      if (collision) hash = ancienHash
    }
    hashesMaj.add(hash)
    opsOffres.push(prisma.offre.update({
      where: { id },
      data: {
        ...champsNormalises(item.offre),
        dedupHash: hash,
        lastSeen: now,
        // Une offre revue vivante repasse `active` (ADR-0002) ; une offre morte
        // n'est pas touchée ici — l'orchestrateur l'expirera après un run réussi.
        ...(item.morte ? {} : { statut: OffreStatut.active })
      }
    }))
    if (item.morte) resultat.idsMortes.push(id)
  }
  for (const { item, id } of majHash) {
    opsOffres.push(prisma.offre.update({
      where: { id },
      data: { lastSeen: now, ...(item.morte ? {} : { statut: OffreStatut.active }) }
    }))
    if (item.morte) resultat.idsMortes.push(id)
  }
  if (opsOffres.length > 0) await prisma.$transaction(opsOffres)
  resultat.maj += majUrl.length + majHash.length

  // ── Lignes OffreSource des mises à jour ──
  const idsMaj = [...new Set([...majUrl.map((m) => m.id), ...majHash.map((m) => m.id)])]
  if (idsMaj.length > 0) {
    const lignes = await prisma.offreSource.findMany({
      where: { source, offreId: { in: idsMaj } },
      select: { offreId: true, partnerLabel: true, partnerJobId: true }
    })
    const ligneParOffre = new Map(lignes.map((l) => [l.offreId, l]))
    const aCreer: Prisma.OffreSourceCreateManyInput[] = []
    const complements: Prisma.PrismaPromise<unknown>[] = []
    const creationsPrevues = new Set<string>()
    for (const { item, id } of [...majUrl, ...majHash]) {
      const ligne = ligneParOffre.get(id)
      if (ligne === undefined) {
        // Offre connue mais jamais vue par CETTE source : rattachement.
        if (!creationsPrevues.has(id)) {
          creationsPrevues.add(id)
          aCreer.push({
            offreId: id,
            source,
            partnerLabel: item.offre.partnerLabel,
            partnerJobId: item.offre.partnerJobId,
            firstSeen: now,
            lastSeen: now
          })
        }
        continue
      }
      // Attribution de première vue conservée (CGU) : on ne complète que les
      // champs encore null, on n'écrase jamais.
      const label = ligne.partnerLabel ?? item.offre.partnerLabel
      const jobId = ligne.partnerJobId ?? item.offre.partnerJobId
      if (label !== ligne.partnerLabel || jobId !== ligne.partnerJobId) {
        complements.push(prisma.offreSource.update({
          where: { offreId_source: { offreId: id, source } },
          data: { partnerLabel: label, partnerJobId: jobId }
        }))
      }
    }
    if (aCreer.length > 0) await prisma.offreSource.createMany({ data: aCreer, skipDuplicates: true })
    if (complements.length > 0) await prisma.$transaction(complements)
    await prisma.offreSource.updateMany({
      where: { source, offreId: { in: idsMaj } },
      data: { lastSeen: now }
    })
  }

  // ── Chemin unitaire : conflits internes au lot + retraitements TOCTOU ──
  for (const item of [...aRetraiter, ...differes]) {
    const r = await upsertOffreSeule(prisma, source, item, now, true)
    if (r.action === 'creee') resultat.creees++
    else resultat.maj++
    if (item.morte) resultat.idsMortes.push(r.offreId)
  }

  return resultat
}

// ─────────────────────────── Chemin unitaire ───────────────────────────

async function upsertOffreSeule(
  prisma: PrismaClient,
  source: SourceType,
  item: ItemLot,
  now: Date,
  reessayerSurConflit: boolean
): Promise<{ action: 'creee' | 'maj', offreId: string }> {
  const { offre, hash, morte } = item
  const reactivation = morte ? {} : { statut: OffreStatut.active }

  const parUrl = await prisma.offre.findUnique({
    where: { url: offre.url },
    select: { id: true, dedupHash: true }
  })
  if (parUrl) {
    let nouveauHash = hash
    if (hash !== parUrl.dedupHash) {
      const collision = await prisma.offre.findUnique({ where: { dedupHash: hash }, select: { id: true } })
      if (collision && collision.id !== parUrl.id) nouveauHash = parUrl.dedupHash
    }
    await prisma.offre.update({
      where: { id: parUrl.id },
      data: { ...champsNormalises(offre), dedupHash: nouveauHash, lastSeen: now, ...reactivation }
    })
    await rattacherSource(prisma, parUrl.id, source, offre, now)
    return { action: 'maj', offreId: parUrl.id }
  }

  const parHash = await prisma.offre.findUnique({ where: { dedupHash: hash }, select: { id: true } })
  if (parHash) {
    await prisma.offre.update({ where: { id: parHash.id }, data: { lastSeen: now, ...reactivation } })
    await rattacherSource(prisma, parHash.id, source, offre, now)
    return { action: 'maj', offreId: parHash.id }
  }

  try {
    const creee = await prisma.offre.create({
      data: {
        url: offre.url,
        dedupHash: hash,
        sourceOrigine: source,
        ...champsNormalises(offre),
        firstSeen: now,
        lastSeen: now,
        sources: {
          create: {
            source,
            partnerLabel: offre.partnerLabel,
            partnerJobId: offre.partnerJobId,
            firstSeen: now,
            lastSeen: now
          }
        }
      },
      select: { id: true }
    })
    return { action: 'creee', offreId: creee.id }
  } catch (erreur) {
    // TOCTOU : l'offre vient d'être créée par une écriture concurrente —
    // un seul nouveau passage suffit, elle sera reclassée en conflit url/hash.
    if (reessayerSurConflit && estConflitUnicite(erreur)) {
      return upsertOffreSeule(prisma, source, item, now, false)
    }
    throw erreur
  }
}

/**
 * Rattache/rafraîchit la ligne `OffreSource` (PK (offreId, source)) sans
 * jamais écraser une attribution existante (complète seulement les null).
 */
async function rattacherSource(
  prisma: PrismaClient,
  offreId: string,
  source: SourceType,
  offre: OffreNormalisee,
  now: Date
): Promise<void> {
  const ligne = await prisma.offreSource.findUnique({
    where: { offreId_source: { offreId, source } },
    select: { partnerLabel: true, partnerJobId: true }
  })
  if (ligne === null) {
    await prisma.offreSource.create({
      data: {
        offreId,
        source,
        partnerLabel: offre.partnerLabel,
        partnerJobId: offre.partnerJobId,
        firstSeen: now,
        lastSeen: now
      }
    })
    return
  }
  await prisma.offreSource.update({
    where: { offreId_source: { offreId, source } },
    data: {
      partnerLabel: ligne.partnerLabel ?? offre.partnerLabel,
      partnerJobId: ligne.partnerJobId ?? offre.partnerJobId,
      lastSeen: now
    }
  })
}
