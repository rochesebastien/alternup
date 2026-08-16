export const PUBLIC_API_ROUTES = [
  '/api/health',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout'
] as const

// Endpoints internes des modules Nuxt, servis sous /api/_ :
//   - /api/_auth/session  (nuxt-auth-utils) doit répondre une session vide aux
//     visiteurs anonymes, sinon le client ne sait jamais qu'il est déconnecté ;
//   - /api/_nuxt_icon/*   (@nuxt/icon) sert les icônes en local. Le bloquer
//     renvoyait un 401 sur toutes les pages publiques : plus aucune icône
//     (chevron des menus déroulants, spinner des boutons...) ne s'affichait.
// `/api/invitations/token/<token>` (GET) est consulté depuis /register par un
// visiteur non connecté : le token aléatoire sert de capacité d'accès. Le
// préfixe s'arrête volontairement à `token/` : les autres routes du dossier
// (création, liste, révocation) restent protégées.
export const PUBLIC_API_PREFIXES = ['/api/_', '/api/invitations/token/'] as const

export const PUBLIC_PAGES = ['/', '/login', '/register', '/forbidden'] as const

function stripQuery(path: string): string {
  const i = path.indexOf('?')
  return i === -1 ? path : path.slice(0, i)
}

export function isPublicApiRoute(path: string): boolean {
  const clean = stripQuery(path)
  if (PUBLIC_API_PREFIXES.some((prefix) => clean.startsWith(prefix))) return true
  return (PUBLIC_API_ROUTES as readonly string[]).includes(clean)
}

export function isPublicPage(path: string): boolean {
  return (PUBLIC_PAGES as readonly string[]).includes(stripQuery(path))
}
