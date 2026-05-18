import { describe, expect, it } from 'vitest'
import {
  PUBLIC_API_ROUTES,
  PUBLIC_PAGES,
  isPublicApiRoute,
  isPublicPage
} from '~/shared/utils/public-routes'

describe('isPublicApiRoute', () => {
  it.each(PUBLIC_API_ROUTES)('lets %s through', (path) => {
    expect(isPublicApiRoute(path)).toBe(true)
  })

  it.each([
    '/api/auth/me',
    '/api/alternants',
    '/api/tutors/123/learners',
    '/api/projects/abc'
  ])('blocks %s', (path) => {
    expect(isPublicApiRoute(path)).toBe(false)
  })

  it('strips a query string before matching', () => {
    expect(isPublicApiRoute('/api/health?ts=42')).toBe(true)
  })
})

describe('isPublicPage', () => {
  it.each(PUBLIC_PAGES)('lets %s through', (path) => {
    expect(isPublicPage(path)).toBe(true)
  })

  it.each(['/alternants', '/alternants/abc', '/dashboard'])(
    'blocks %s',
    (path) => {
      expect(isPublicPage(path)).toBe(false)
    }
  )

  it('strips a query string before matching', () => {
    expect(isPublicPage('/login?redirect=/dashboard')).toBe(true)
  })
})
