import { Prisma, ReportStatus, SignatureDocumentType } from '@prisma/client'
import type { User } from '#auth-utils'
import { prisma } from '~/server/utils/prisma'
import { loadCardVisibleTo, type VisibleReportCard } from '~/server/utils/report-cards'
import { loadReportVisibleTo, type VisibleProgressReport } from '~/server/utils/reports'
import { notifyUser } from '~/server/utils/notifications'
import {
  buildSignatureParties,
  canSignDocument,
  signatureDocumentLabel,
  signatureIneligibleReason,
  type DocumentSignatureView,
  type SignatureBlock,
  type SignatureParties
} from '~/shared/utils/signatures'

/**
 * Un document signable, une fois sa visibilité vérifiée. `eligible` porte la
 * règle d'état propre au type (bulletin publié / rapport validé) ; `parties`
 * porte les deux seules identités habilitées à signer.
 */
export interface SignableDocument {
  documentType: SignatureDocumentType
  documentId: string
  eligible: boolean
  parties: SignatureParties
  /** Intitulé lisible du document (notifications, messages d'erreur). */
  title: string
  /** Chemin interne de l'écran du document. */
  link: string
}

function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`
}

/**
 * Décrit un bulletin déjà chargé comme document signable. Aucune requête : la
 * visibilité a été tranchée en amont par `loadCardVisibleTo`.
 */
export function signableCardOf(card: VisibleReportCard): SignableDocument {
  return {
    documentType: SignatureDocumentType.bulletin,
    documentId: card.id,
    // Un bulletin non publié est un brouillon du tuteur : rien à signer.
    eligible: card.publishedAt !== null,
    parties: {
      tutor: { id: card.period.tutor.id, name: fullName(card.period.tutor) },
      student: { id: card.student.id, name: fullName(card.student) }
    },
    title: `Bulletin — ${card.period.label}`,
    link: `/bulletins/carte/${card.id}`
  }
}

/**
 * Charge un bulletin signable. La visibilité réseau est déléguée à
 * `loadCardVisibleTo` : 404 (jamais 403) si l'appelant n'est ni l'étudiant
 * concerné ni le tuteur de la période.
 */
export async function loadSignableCard(
  id: string,
  user: User
): Promise<SignableDocument> {
  return signableCardOf(await loadCardVisibleTo(id, user))
}

/**
 * Décrit un rapport d'étape déjà chargé comme document signable. Aucune
 * requête : la visibilité a été tranchée par `loadReportVisibleTo`.
 */
export function signableReportOf(report: VisibleProgressReport): SignableDocument {
  return {
    documentType: SignatureDocumentType.rapport,
    documentId: report.id,
    // Tant que le tuteur n'a pas validé, le rapport peut encore être réécrit.
    eligible: report.status === ReportStatus.valide,
    parties: {
      tutor: { id: report.tutor.id, name: fullName(report.tutor) },
      student: { id: report.student.id, name: fullName(report.student) }
    },
    title: report.title,
    link: `/rapports/${report.id}`
  }
}

/**
 * Charge un rapport d'étape signable. Visibilité déléguée à
 * `loadReportVisibleTo` (404 sinon).
 */
export async function loadSignableReport(
  id: string,
  user: User
): Promise<SignableDocument> {
  return signableReportOf(await loadReportVisibleTo(id, user))
}

/** Signatures enregistrées pour un document, de la plus ancienne à la plus récente. */
export async function listSignatures(
  documentType: SignatureDocumentType,
  documentId: string
): Promise<DocumentSignatureView[]> {
  const rows = await prisma.documentSignature.findMany({
    where: { documentType, documentId },
    orderBy: { signedAt: 'asc' },
    select: {
      userId: true,
      signedAt: true,
      user: { select: { firstName: true, lastName: true } }
    }
  })

  return rows.map((row) => ({
    userId: row.userId,
    firstName: row.user.firstName,
    lastName: row.user.lastName,
    signedAt: row.signedAt.toISOString()
  }))
}

/**
 * Signatures de plusieurs documents du même type, indexées par `documentId`.
 * Une seule requête : utilisé par le livret, qui compile N bulletins et
 * N rapports.
 */
export async function listSignaturesByDocument(
  documentType: SignatureDocumentType,
  documentIds: string[]
): Promise<Map<string, DocumentSignatureView[]>> {
  const byDocument = new Map<string, DocumentSignatureView[]>()
  if (documentIds.length === 0) return byDocument

  const rows = await prisma.documentSignature.findMany({
    where: { documentType, documentId: { in: documentIds } },
    orderBy: { signedAt: 'asc' },
    select: {
      documentId: true,
      userId: true,
      signedAt: true,
      user: { select: { firstName: true, lastName: true } }
    }
  })

  for (const row of rows) {
    const list = byDocument.get(row.documentId) ?? []
    list.push({
      userId: row.userId,
      firstName: row.user.firstName,
      lastName: row.user.lastName,
      signedAt: row.signedAt.toISOString()
    })
    byDocument.set(row.documentId, list)
  }

  return byDocument
}

/** Bloc « Signatures » prêt à sérialiser pour un document déjà chargé. */
export async function signatureBlockOf(
  document: SignableDocument
): Promise<SignatureBlock> {
  const signatures = await listSignatures(document.documentType, document.documentId)
  return {
    documentType: document.documentType,
    documentId: document.documentId,
    eligible: document.eligible,
    parties: buildSignatureParties(document.parties, signatures)
  }
}

/**
 * Enregistre la signature de l'utilisateur courant et renvoie le bloc à jour.
 *
 * Les refus sont explicites côté API car le document est déjà visible par
 * l'appelant à ce stade (la protection contre la fuite d'existence est faite en
 * amont, par les helpers de visibilité) :
 *   • 403 si l'utilisateur n'est pas une partie du document ;
 *   • 409 si le document n'est pas encore signable, ou s'il a déjà été signé.
 */
export async function signDocument(
  document: SignableDocument,
  user: User
): Promise<SignatureBlock> {
  const block = await signatureBlockOf(document)

  const party = block.parties.find((candidate) => candidate.userId === user.id)
  if (!party) {
    throw createError({
      statusCode: 403,
      statusMessage: "Vous n'êtes pas partie à ce document."
    })
  }

  if (!block.eligible) {
    throw createError({
      statusCode: 409,
      statusMessage: signatureIneligibleReason(document.documentType)
    })
  }

  if (!canSignDocument(block, user.id)) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Vous avez déjà signé ce document.'
    })
  }

  try {
    await prisma.documentSignature.create({
      data: {
        documentType: document.documentType,
        documentId: document.documentId,
        userId: user.id
      }
    })
  } catch (error) {
    // P2002 = contrainte d'unicité : deux clics simultanés sur « Signer ». La
    // signature existe déjà, l'état visé est atteint — on renvoie le bloc à jour
    // plutôt qu'une erreur incompréhensible pour l'utilisateur.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return signatureBlockOf(document)
    }
    throw error
  }

  // L'autre partie est prévenue : c'est elle qui doit signer à son tour pour
  // que le document devienne opposable (tableau de bord des statuts façon SIRH).
  const other = block.parties.find((candidate) => candidate.userId !== user.id)
  if (other && other.signedAt === null) {
    await notifyUser(other.userId, {
      type: 'document_signe',
      title: `${signatureDocumentLabel(document.documentType)} signé : ${document.title}`,
      body: `${user.firstName} ${user.lastName} a signé. Votre signature est attendue.`,
      link: document.link
    })
  }

  return signatureBlockOf(document)
}
