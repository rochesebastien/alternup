import { describe, expect, it } from 'vitest'
import { Role } from '@prisma/client'
import { landingPageFor, resolvePostLoginPath } from '~/shared/utils/auth-redirect'

describe('landingPageFor', () => {
  it('sends tutors to the learners list', () => {
    expect(landingPageFor(Role.Tutor)).toBe('/alternants')
  })

  it.each([Role.Alternant, Role.Stagiaire])('sends %s to their missions', (role) => {
    expect(landingPageFor(role)).toBe('/missions')
  })
})

describe('resolvePostLoginPath', () => {
  it('uses the requested path when it is a valid relative URL', () => {
    expect(resolvePostLoginPath(Role.Tutor, '/projects/42')).toBe('/projects/42')
  })

  it('falls back to the default landing when no path is requested', () => {
    expect(resolvePostLoginPath(Role.Tutor)).toBe('/alternants')
    expect(resolvePostLoginPath(Role.Alternant, null)).toBe('/missions')
  })

  it.each([
    'https://evil.example.com',
    '//evil.example.com',
    'javascript:alert(1)',
    'relative-no-slash'
  ])('rejects unsafe redirect %s', (target) => {
    expect(resolvePostLoginPath(Role.Tutor, target)).toBe('/alternants')
  })
})
