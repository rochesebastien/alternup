import { describe, expect, it } from 'vitest'
import { Role } from '~/shared/utils/enums'
import {
  formatZodIssues,
  loginInputSchema,
  registerInputSchema
} from '~/shared/utils/auth-credentials'

describe('registerInputSchema', () => {
  const baseInput = {
    email: 'Alice@Example.com  ',
    password: 'a-strong-pw',
    firstName: '  Alice ',
    lastName: ' Doe ',
    role: Role.Tutor
  }

  it('normalises the email to lowercase + trimmed', () => {
    const result = registerInputSchema.safeParse(baseInput)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('alice@example.com')
  })

  it('trims first and last name', () => {
    const result = registerInputSchema.safeParse(baseInput)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.firstName).toBe('Alice')
      expect(result.data.lastName).toBe('Doe')
    }
  })

  it('defaults the role to Alternant when omitted', () => {
    const { role: _ignored, ...rest } = baseInput
    const result = registerInputSchema.safeParse(rest)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.role).toBe(Role.Alternant)
  })

  it.each([Role.Tutor, Role.Alternant, Role.Stagiaire])(
    'accepts the role %s',
    (role) => {
      const result = registerInputSchema.safeParse({ ...baseInput, role })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.role).toBe(role)
    }
  )

  it('rejects an unknown role', () => {
    const result = registerInputSchema.safeParse({ ...baseInput, role: 'Admin' })
    expect(result.success).toBe(false)
  })

  it('rejects a password shorter than 8 characters', () => {
    const result = registerInputSchema.safeParse({ ...baseInput, password: 'short' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('password')
    }
  })

  it('rejects an invalid email', () => {
    const result = registerInputSchema.safeParse({ ...baseInput, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects empty names after trim', () => {
    const result = registerInputSchema.safeParse({ ...baseInput, firstName: '   ' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('firstName')
    }
  })
})

describe('loginInputSchema', () => {
  it('normalises the email', () => {
    const result = loginInputSchema.safeParse({
      email: '  Bob@Example.com',
      password: 'whatever'
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('bob@example.com')
  })

  it('requires a non-empty password', () => {
    const result = loginInputSchema.safeParse({ email: 'bob@example.com', password: '' })
    expect(result.success).toBe(false)
  })
})

describe('formatZodIssues', () => {
  it('flattens issues into { path, message } pairs', () => {
    const result = registerInputSchema.safeParse({ email: 'nope', password: '1234' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issues = formatZodIssues(result.error)
      for (const issue of issues) {
        expect(typeof issue.path).toBe('string')
        expect(typeof issue.message).toBe('string')
      }
      const paths = issues.map((i) => i.path)
      expect(paths).toContain('email')
      expect(paths).toContain('password')
    }
  })
})
