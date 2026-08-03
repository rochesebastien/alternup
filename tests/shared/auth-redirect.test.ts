import { describe, expect, it } from 'vitest'
import { Role } from '~/shared/utils/enums'
import { landingPageFor, resolvePostLoginPath } from '~/shared/utils/auth-redirect'

describe('landingPageFor', () => {
  it.each([Role.Tutor, Role.Alternant, Role.Stagiaire])(
    'sends %s to the dashboard',
    (role) => {
      expect(landingPageFor(role)).toBe('/dashboard')
    }
  )
})

describe('resolvePostLoginPath', () => {
  it('uses the requested path when it is a valid relative URL', () => {
    expect(resolvePostLoginPath(Role.Tutor, '/projects/42')).toBe('/projects/42')
  })

  it('falls back to the dashboard when no path is requested', () => {
    expect(resolvePostLoginPath(Role.Tutor)).toBe('/dashboard')
    expect(resolvePostLoginPath(Role.Alternant, null)).toBe('/dashboard')
  })

  it.each([
    'https://evil.example.com',
    '//evil.example.com',
    'javascript:alert(1)',
    'relative-no-slash'
  ])('rejects unsafe redirect %s', (target) => {
    expect(resolvePostLoginPath(Role.Tutor, target)).toBe('/dashboard')
  })
})
