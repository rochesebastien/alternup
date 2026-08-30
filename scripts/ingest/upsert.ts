// Écriture idempotente d'une offre normalisée (règles de dédup ADR-0002).
//
// 1. Conflit sur `url`   → mise à jour lastSeen + champs normalisés + raw,
//                          lastSeen de la ligne `OffreSource` rafraîchi.
// 2. Conflit sur `dedupHash` (même offre vue via une autre URL/source) →
//    PAS de doublon : rattachement d'une ligne `OffreSource` supplémentaire
//    (upsert sur la PK composite (offreId, source)) + lastSeen rafraîchi.
// 3. Sinon → création `Offre` + ligne `OffreSource` (create imbriqué, atomique).
//
// L'upsert ne passe JAMAIS une offre `expiree` (l'expiration n'est appliquée
// qu'au terme d'un run réussi, par l'orchestrateur) ; il se contente de
// réactiver (`statut: active`) une offre revue vivante dans le dump (ADR-0002).

import type { Prisma, PrismaClient } from '@prisma/client'
import { dedupHashOf } from '../../server/utils/offres-dedup.ts'
import { OffreStatut } from '../../shared/utils/enums.ts'
import { estMorteSelonSource, type OffreNormalisee, type SourceIngestion } from './types.ts'

export interface UpsertResultat {
  action: 'creee' | 'maj'
  offreId: string
  /** Payload source déclarant l'offre morte (Filled/Cancelled ou expiration dépassée). */
  morte: boolean
}

export interface CompteursUpsert {
  vues: number
  creees: number
  maj: number
}

/** Champs normalisés rafraîchis lors d'une mise à jour par conflit d'`url`. */
function champsNormalises(offre: OffreNormalisee) {
  return {
    titre: offre.titre,
    entreprise: offre.entreprise,
    lieu: offre.lieu,
    typeContrat: offre.typeContrat,
    niveauDiplome: offre.niveauDiplome,
    romeCodes: offre.romeCodes,
    datePublication: offre.datePublication,
    dateExpiration: offre.dateExpiration,
    raw: offre.raw as Prisma.InputJsonValue
  }
}

export async function upsertOffre(
  prisma: PrismaClient,
  source: SourceIngestion['source'],
  offre: OffreNormalisee,
  now: Date
): Promise<UpsertResultat> {
  const dedupHash = dedupHashOf(offre.titre, offre.entreprise, offre.lieu)
  const morte = estMorteSelonSource(offre, now)
  // Une offre revue vivante repasse `active` (ADR-0002) ; une offre morte
  // n'est pas touchée ici — l'orchestrateur l'expirera après un run réussi.
  const reactivation = morte ? {} : { statut: OffreStatut.active }

  // 1. Conflit sur `url` : l'offre est déjà connue, on la rafraîchit.
  const parUrl = await prisma.offre.findUnique({ where: { url: offre.url }, select: { id: true, dedupHash: true } })
  if (parUrl) {
    let nouveauHash = dedupHash
    if (dedupHash !== parUrl.dedupHash) {
      // Le triplet (titre, entreprise, lieu) a changé : le nouveau hash peut
      // entrer en collision avec une AUTRE offre (contrainte unique). Cas
      // limite : on conserve alors l'ancien hash plutôt que de faire échouer
      // la ligne — la dédup par URL reste correcte.
      const collision = await prisma.offre.findUnique({ where: { dedupHash }, select: { id: true } })
      if (collision && collision.id !== parUrl.id) nouveauHash = parUrl.dedupHash
    }
    await prisma.offre.update({
      where: { id: parUrl.id },
      data: { ...champsNormalises(offre), dedupHash: nouveauHash, lastSeen: now, ...reactivation }
    })
    await rattacherSource(prisma, parUrl.id, source, offre, now)
    return { action: 'maj', offreId: parUrl.id, morte }
  }

  // 2. Conflit sur `dedupHash` : même offre logique vue via une autre URL —
  //    pas de doublon, rattachement d'une source supplémentaire.
  const parHash = await prisma.offre.findUnique({ where: { dedupHash }, select: { id: true } })
  if (parHash) {
    await prisma.offre.update({
      where: { id: parHash.id },
      data: { lastSeen: now, ...reactivation }
    })
    await rattacherSource(prisma, parHash.id, source, offre, now)
    return { action: 'maj', offreId: parHash.id, morte }
  }

  // 3. Offre inconnue : création (Offre + OffreSource, atomique).
  const creee = await prisma.offre.create({
    data: {
      url: offre.url,
      dedupHash,
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
  return { action: 'creee', offreId: creee.id, morte }
}

/** Upsert de la ligne `OffreSource` sur sa PK composite (offreId, source). */
async function rattacherSource(
  prisma: PrismaClient,
  offreId: string,
  source: SourceIngestion['source'],
  offre: OffreNormalisee,
  now: Date
): Promise<void> {
  await prisma.offreSource.upsert({
    where: { offreId_source: { offreId, source } },
    create: {
      offreId,
      source,
      partnerLabel: offre.partnerLabel,
      partnerJobId: offre.partnerJobId,
      firstSeen: now,
      lastSeen: now
    },
    update: {
      partnerLabel: offre.partnerLabel,
      partnerJobId: offre.partnerJobId,
      lastSeen: now
    }
  })
}
