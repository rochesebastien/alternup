export const PUBLIC_API_ROUTES = [
  '/api/health',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout'
] as const

export const PUBLIC_PAGES = ['/', '/login', '/register', '/forbidden'] as const

function stripQuery(path: string): string {
  const i = path.indexOf('?')
  return i === -1 ? path : path.slice(0, i)
}

export function isPublicApiRoute(path: string): boolean {
  return (PUBLIC_API_ROUTES as readonly string[]).includes(stripQuery(path))
}

export function isPublicPage(path: string): boolean {
  return (PUBLIC_PAGES as readonly string[]).includes(stripQuery(path))
}
