import { describe, expect, it } from 'vitest'
import { addLearnerBodySchema } from '~/shared/utils/tutor-learners'

describe('addLearnerBodySchema', () => {
  it('accepts a UUID body', () => {
    const result = addLearnerBodySchema.safeParse({
      userId: '11111111-1111-1111-1111-111111111111'
    })
    expect(result.success).toBe(true)
  })

  it('accepts an email body and normalises it', () => {
    const result = addLearnerBodySchema.safeParse({ email: '  Bob@Example.COM' })
    expect(result.success).toBe(true)
    if (result.success && 'email' in result.data) {
      expect(result.data.email).toBe('bob@example.com')
    }
  })

  it('rejects an empty body', () => {
    expect(addLearnerBodySchema.safeParse({}).success).toBe(false)
  })

  it('rejects an invalid UUID', () => {
    expect(addLearnerBodySchema.safeParse({ userId: 'not-a-uuid' }).success).toBe(false)
  })

  it('rejects an invalid email', () => {
    expect(addLearnerBodySchema.safeParse({ email: 'not-an-email' }).success).toBe(false)
  })
})
