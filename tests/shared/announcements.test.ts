import { describe, expect, it } from 'vitest'
import {
  announcementCreateSchema,
  partitionAnnouncements,
  unreadAnnouncements
} from '~/shared/utils/announcements'

const GUID = '23fd8f00-6c23-4acc-b184-da450759b251'
const OTHER_GUID = '754fd42c-3a14-42f9-b13e-cdf0987bea1c'

describe('announcementCreateSchema', () => {
  const valid = { title: 'Réunion', body: 'Lundi 9h', recipientIds: [GUID] }

  it('accepte une annonce valide', () => {
    expect(announcementCreateSchema.safeParse(valid).success).toBe(true)
  })

  it('accepte plusieurs destinataires', () => {
    expect(
      announcementCreateSchema.safeParse({ ...valid, recipientIds: [GUID, OTHER_GUID] }).success
    ).toBe(true)
  })

  it('exige au moins un destinataire', () => {
    expect(announcementCreateSchema.safeParse({ ...valid, recipientIds: [] }).success).toBe(false)
  })

  it('exige un titre et un contenu', () => {
    expect(announcementCreateSchema.safeParse({ ...valid, title: '  ' }).success).toBe(false)
    expect(announcementCreateSchema.safeParse({ ...valid, body: '' }).success).toBe(false)
  })
})

describe('partitionAnnouncements', () => {
  const items = [
    { id: 'a', mine: true },
    { id: 'b', mine: false },
    { id: 'c', mine: false }
  ]

  it('sépare les annonces publiées des annonces reçues', () => {
    const { received, sent } = partitionAnnouncements(items)
    expect(sent.map((a) => a.id)).toEqual(['a'])
    expect(received.map((a) => a.id)).toEqual(['b', 'c'])
  })

  it('gère une liste vide', () => {
    expect(partitionAnnouncements([])).toEqual({ received: [], sent: [] })
  })
})

describe('unreadAnnouncements', () => {
  it('ne retient que les annonces reçues et non lues', () => {
    const items = [
      // Sa propre annonce n'est jamais « à lire », même sans date de lecture.
      { id: 'a', mine: true, readAt: null },
      { id: 'b', mine: false, readAt: null },
      { id: 'c', mine: false, readAt: '2026-08-11T09:00:00.000Z' }
    ]
    expect(unreadAnnouncements(items).map((a) => a.id)).toEqual(['b'])
  })
})
