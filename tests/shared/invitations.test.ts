import { describe, expect, it } from 'vitest'
import { invitationCreateSchema, invitationStatus } from '~/shared/utils/invitations'

describe('invitationCreateSchema', () => {
  it('accepts a minimal invitation (email only, role Stagiaire par défaut)', () => {
    const result = invitationCreateSchema.safeParse({ email: 'jean@exemple.com' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.role).toBe('Stagiaire')
  })

  it('normalise l\'email (trim + minuscules)', () => {
    const result = invitationCreateSchema.safeParse({ email: '  Jean@Exemple.COM ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('jean@exemple.com')
  })

  it('accepts an Alternant invitation with names', () => {
    expect(
      invitationCreateSchema.safeParse({
        email: 'lea@exemple.com',
        firstName: 'Léa',
        lastName: 'Martin',
        role: 'Alternant'
      }).success
    ).toBe(true)
  })

  it('rejects an invalid email', () => {
    expect(invitationCreateSchema.safeParse({ email: 'pas-un-email' }).success).toBe(false)
  })

  it('rejects the Tutor role', () => {
    expect(
      invitationCreateSchema.safeParse({ email: 'x@exemple.com', role: 'Tutor' }).success
    ).toBe(false)
  })
})

describe('invitationStatus', () => {
  const now = new Date('2026-08-10T12:00:00Z')

  it('is pending before expiry when not accepted', () => {
    expect(
      invitationStatus({ acceptedAt: null, expiresAt: '2026-08-17T12:00:00Z' }, now)
    ).toBe('pending')
  })

  it('is expired after expiry when not accepted', () => {
    expect(
      invitationStatus({ acceptedAt: null, expiresAt: '2026-08-09T12:00:00Z' }, now)
    ).toBe('expired')
  })

  it('is accepted once consumed, even past expiry', () => {
    expect(
      invitationStatus(
        { acceptedAt: '2026-08-05T12:00:00Z', expiresAt: '2026-08-09T12:00:00Z' },
        now
      )
    ).toBe('accepted')
  })
})
