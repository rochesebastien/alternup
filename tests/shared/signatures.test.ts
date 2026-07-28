import { describe, expect, it } from 'vitest'
import {
  SIGNATORY_ROLE_LABELS,
  SIGNATURE_DOCUMENT_LABELS,
  SIGNATURE_INELIGIBLE_REASONS,
  buildSignatureParties,
  canSignDocument,
  formatSignatureDate,
  formatSignatureTimestamp,
  isFullySigned,
  signatoryRoleLabel,
  signatoryRoleOf,
  signatureDocumentLabel,
  signatureIneligibleReason,
  signatureStatusText,
  signedCount,
  type DocumentSignatureView,
  type SignatureParties,
  type SignatureParty
} from '~/shared/utils/signatures'

const PARTIES: SignatureParties = {
  tutor: { id: 'tutor-1', name: 'Claire Dubois' },
  student: { id: 'student-1', name: 'Léa Martin' }
}

// 16:30 heure de Paris en été (UTC+2).
const SIGNED_AT = '2026-07-28T14:30:00.000Z'

function signature(userId: string, signedAt = SIGNED_AT): DocumentSignatureView {
  return { userId, firstName: 'Peu', lastName: 'Importe', signedAt }
}

describe('libellés', () => {
  it('expose un libellé FR pour chaque type de document', () => {
    expect(SIGNATURE_DOCUMENT_LABELS.bulletin).toBe('Bulletin')
    expect(SIGNATURE_DOCUMENT_LABELS.rapport).toBe("Rapport d'étape")
    expect(signatureDocumentLabel('bulletin')).toBe('Bulletin')
  })

  it('retombe sur un libellé neutre pour un type inconnu', () => {
    expect(signatureDocumentLabel('convention')).toBe('Document')
  })

  it('expose un libellé FR pour chaque partie signataire', () => {
    expect(signatoryRoleLabel('tutor')).toBe(SIGNATORY_ROLE_LABELS.tutor)
    expect(signatoryRoleLabel('student')).toBe(SIGNATORY_ROLE_LABELS.student)
  })

  it('explique pourquoi un document n’est pas encore signable', () => {
    expect(signatureIneligibleReason('bulletin')).toBe(
      SIGNATURE_INELIGIBLE_REASONS.bulletin
    )
    expect(signatureIneligibleReason('rapport')).toBe(
      SIGNATURE_INELIGIBLE_REASONS.rapport
    )
    expect(signatureIneligibleReason('inconnu')).toBe("Ce document n'est pas signable.")
  })
})

describe('buildSignatureParties', () => {
  it('rend toujours les deux parties, tuteur en premier', () => {
    const parties = buildSignatureParties(PARTIES, [])

    expect(parties).toHaveLength(2)
    expect(parties[0]).toMatchObject({ role: 'tutor', userId: 'tutor-1', signedAt: null })
    expect(parties[1]).toMatchObject({
      role: 'student',
      userId: 'student-1',
      signedAt: null
    })
  })

  it('associe chaque signature à sa partie', () => {
    const parties = buildSignatureParties(PARTIES, [signature('student-1')])

    expect(parties[0]!.signedAt).toBeNull()
    expect(parties[1]!.signedAt).toBe(SIGNED_AT)
  })

  it('ignore une signature qui n’appartient à aucune des deux parties', () => {
    const parties = buildSignatureParties(PARTIES, [signature('intrus-9')])

    expect(parties.every((party) => party.signedAt === null)).toBe(true)
  })
})

describe('canSignDocument', () => {
  const eligibleBlock = {
    eligible: true,
    parties: buildSignatureParties(PARTIES, [])
  }

  it('autorise une partie qui n’a pas encore signé sur un document éligible', () => {
    expect(canSignDocument(eligibleBlock, 'tutor-1')).toBe(true)
    expect(canSignDocument(eligibleBlock, 'student-1')).toBe(true)
  })

  it('refuse un tiers, même sur un document éligible', () => {
    expect(canSignDocument(eligibleBlock, 'intrus-9')).toBe(false)
    expect(canSignDocument(eligibleBlock, null)).toBe(false)
    expect(canSignDocument(eligibleBlock, undefined)).toBe(false)
  })

  it('refuse tant que le document n’est pas éligible (non publié / non validé)', () => {
    expect(
      canSignDocument({ eligible: false, parties: eligibleBlock.parties }, 'tutor-1')
    ).toBe(false)
  })

  it('refuse une seconde signature de la même partie', () => {
    const block = {
      eligible: true,
      parties: buildSignatureParties(PARTIES, [signature('tutor-1')])
    }

    expect(canSignDocument(block, 'tutor-1')).toBe(false)
    expect(canSignDocument(block, 'student-1')).toBe(true)
  })
})

describe('signatoryRoleOf / signedCount / isFullySigned', () => {
  const parties = buildSignatureParties(PARTIES, [signature('tutor-1')])

  it('identifie le rôle signataire d’un utilisateur', () => {
    expect(signatoryRoleOf(parties, 'tutor-1')).toBe('tutor')
    expect(signatoryRoleOf(parties, 'student-1')).toBe('student')
    expect(signatoryRoleOf(parties, 'intrus-9')).toBeNull()
    expect(signatoryRoleOf(parties, null)).toBeNull()
  })

  it('compte les signatures et détecte le document complet', () => {
    expect(signedCount(parties)).toBe(1)
    expect(isFullySigned(parties)).toBe(false)

    const complete = buildSignatureParties(PARTIES, [
      signature('tutor-1'),
      signature('student-1')
    ])
    expect(signedCount(complete)).toBe(2)
    expect(isFullySigned(complete)).toBe(true)
  })

  it('ne considère pas un document sans partie comme signé', () => {
    expect(isFullySigned([])).toBe(false)
  })
})

describe('formatage des horodatages', () => {
  it('formate la date au format français, fuseau Europe/Paris', () => {
    expect(formatSignatureDate(SIGNED_AT)).toBe('28/07/2026')
    expect(formatSignatureDate(new Date(SIGNED_AT))).toBe('28/07/2026')
  })

  it('formate l’horodatage complet de façon stable', () => {
    expect(formatSignatureTimestamp(SIGNED_AT)).toBe('28/07/2026 à 16:30')
  })

  it('bascule de jour correctement autour de minuit à Paris', () => {
    // 22:15 UTC le 28 = 00:15 le 29 à Paris (UTC+2 en été).
    expect(formatSignatureTimestamp('2026-07-28T22:15:00.000Z')).toBe(
      '29/07/2026 à 00:15'
    )
  })

  it('renvoie null pour une date absente ou invalide', () => {
    expect(formatSignatureDate(null)).toBeNull()
    expect(formatSignatureDate(undefined)).toBeNull()
    expect(formatSignatureDate('pas-une-date')).toBeNull()
    expect(formatSignatureTimestamp(null)).toBeNull()
    expect(formatSignatureTimestamp('pas-une-date')).toBeNull()
  })
})

describe('signatureStatusText', () => {
  it('décrit une partie ayant signé', () => {
    const party: SignatureParty = {
      role: 'student',
      userId: 'student-1',
      name: 'Léa Martin',
      signedAt: SIGNED_AT
    }

    expect(signatureStatusText(party)).toBe(
      'Signé par Léa Martin le 28/07/2026 à 16:30'
    )
  })

  it('décrit une partie en attente', () => {
    const party: SignatureParty = {
      role: 'tutor',
      userId: 'tutor-1',
      name: 'Claire Dubois',
      signedAt: null
    }

    expect(signatureStatusText(party)).toBe('En attente de signature')
  })
})
