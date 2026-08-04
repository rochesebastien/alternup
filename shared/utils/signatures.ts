// Signature tripartite des documents (bulletins, rapports d'étape).
//
// Module PUR : aucune dépendance Prisma / runtime serveur. On travaille avec des
// littéraux de chaîne et `import type` (cf. taches/lecons.md n°6). Toute la
// logique d'éligibilité et de présentation vit ici pour être testable sans base
// de données ET partagée entre le serveur (qui l'applique) et l'UI (qui affiche
// le même verdict, sans le dupliquer).
//
// Règles métier (identiques côté serveur et côté client) :
//   • un BULLETIN n'est signable que s'il est publié ;
//   • un RAPPORT d'étape n'est signable que s'il est validé ;
//   • les seules parties habilitées sont le tuteur émetteur et l'étudiant concerné ;
//   • une signature est définitive et idempotente (append-only, jamais rétractée).

import type { SignatureDocumentType } from '~/shared/utils/enums'

// ─────────────────────────── Libellés ───────────────────────────

export const SIGNATURE_DOCUMENT_LABELS: Record<SignatureDocumentType, string> = {
  bulletin: 'Bulletin',
  rapport: "Rapport d'étape"
}

export function signatureDocumentLabel(type: string): string {
  return SIGNATURE_DOCUMENT_LABELS[type as SignatureDocumentType] ?? 'Document'
}

/** Les deux parties signataires d'un document du livret. */
export type SignatoryRole = 'tutor' | 'student'

export const SIGNATORY_ROLE_LABELS: Record<SignatoryRole, string> = {
  tutor: 'Tuteur',
  student: 'Alternant'
}

export function signatoryRoleLabel(role: SignatoryRole): string {
  return SIGNATORY_ROLE_LABELS[role]
}

/** Motif FR affiché quand le document n'est pas encore signable. */
export const SIGNATURE_INELIGIBLE_REASONS: Record<SignatureDocumentType, string> = {
  bulletin: "Le bulletin doit être publié avant d'être signé.",
  rapport: "Le rapport doit être validé avant d'être signé."
}

export function signatureIneligibleReason(type: string): string {
  return (
    SIGNATURE_INELIGIBLE_REASONS[type as SignatureDocumentType] ??
    "Ce document n'est pas signable."
  )
}

// ─────────────────────────── Contrat de données ───────────────────────────

/** Une signature telle qu'exposée par l'API (horodatage ISO). */
export interface DocumentSignatureView {
  userId: string
  firstName: string
  lastName: string
  /** Date ISO de la signature. */
  signedAt: string
}

/** État d'une partie signataire, prêt à afficher. */
export interface SignatureParty {
  role: SignatoryRole
  userId: string
  name: string
  /** Date ISO de la signature, `null` si la partie n'a pas encore signé. */
  signedAt: string | null
}

/** Identité des deux parties d'un document, indépendamment des signatures. */
export interface SignatureParties {
  tutor: { id: string; name: string }
  student: { id: string; name: string }
}

/** Bloc « Signatures » complet, tel que renvoyé par les GET détail. */
export interface SignatureBlock {
  documentType: SignatureDocumentType
  documentId: string
  /** Le document a-t-il atteint l'état qui autorise la signature ? */
  eligible: boolean
  parties: SignatureParty[]
}

// ─────────────────────────── Construction / lecture ───────────────────────────

/**
 * Croise l'identité des parties avec les signatures enregistrées. L'ordre est
 * stable (tuteur puis étudiant) pour que l'affichage ne bouge pas d'un rendu à
 * l'autre. Une signature d'un tiers (donnée incohérente) est ignorée.
 */
export function buildSignatureParties(
  parties: SignatureParties,
  signatures: DocumentSignatureView[]
): SignatureParty[] {
  const signedAtOf = (userId: string): string | null =>
    signatures.find((signature) => signature.userId === userId)?.signedAt ?? null

  return [
    {
      role: 'tutor',
      userId: parties.tutor.id,
      name: parties.tutor.name,
      signedAt: signedAtOf(parties.tutor.id)
    },
    {
      role: 'student',
      userId: parties.student.id,
      name: parties.student.name,
      signedAt: signedAtOf(parties.student.id)
    }
  ]
}

/** Rôle signataire de cet utilisateur sur ce document, `null` s'il n'est pas partie. */
export function signatoryRoleOf(
  parties: SignatureParty[],
  userId: string | null | undefined
): SignatoryRole | null {
  if (!userId) return null
  return parties.find((party) => party.userId === userId)?.role ?? null
}

/**
 * L'utilisateur peut-il signer maintenant ? Vrai uniquement s'il est une partie
 * du document, que le document est éligible, et qu'il n'a pas déjà signé.
 */
export function canSignDocument(
  block: Pick<SignatureBlock, 'eligible' | 'parties'>,
  userId: string | null | undefined
): boolean {
  if (!block.eligible || !userId) return false
  const party = block.parties.find((candidate) => candidate.userId === userId)
  return party !== undefined && party.signedAt === null
}

/** Toutes les parties ont-elles signé ? */
export function isFullySigned(parties: SignatureParty[]): boolean {
  return parties.length > 0 && parties.every((party) => party.signedAt !== null)
}

/** Nombre de parties ayant signé. */
export function signedCount(parties: SignatureParty[]): number {
  return parties.filter((party) => party.signedAt !== null).length
}

// ─────────────────────────── Formatage FR ───────────────────────────

// Fuseau figé : un horodatage de signature doit se lire à l'identique sur
// l'écran du tuteur, sur celui de l'alternant et sur le PDF remis à l'OPCO.
const SIGNATURE_TIME_ZONE = 'Europe/Paris'

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: SIGNATURE_TIME_ZONE
})

// Heure formatée à part puis recollée à la main : le séparateur date/heure de
// `fr-FR` varie selon la version d'ICU (virgule, « à », espace insécable), ce
// qui rendrait l'horodatage instable d'un navigateur à l'autre.
const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: SIGNATURE_TIME_ZONE
})

/** « 28/07/2026 », ou `null` si la date est absente/invalide. */
export function formatSignatureDate(value: string | Date | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return dateFormatter.format(date)
}

/** « 28/07/2026 à 16:30 », ou `null` si la date est absente/invalide. */
export function formatSignatureTimestamp(
  value: string | Date | null | undefined
): string | null {
  if (value === null || value === undefined) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `${dateFormatter.format(date)} à ${timeFormatter.format(date)}`
}

/** Ligne d'état d'une partie : « Signé par Léa Martin le 28/07/2026 à 16:30 ». */
export function signatureStatusText(party: SignatureParty): string {
  const stamp = formatSignatureTimestamp(party.signedAt)
  return stamp ? `Signé par ${party.name} le ${stamp}` : 'En attente de signature'
}
