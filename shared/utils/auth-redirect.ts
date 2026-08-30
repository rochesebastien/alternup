// Espaces par rôle (ADR-0001) : préfixes d'URL, garde par préfixe et
// redirection post-login. Module PUR : aucune dépendance Nuxt/serveur.

import { Role } from '~/shared/utils/enums'

/** Préfixes d'espace et rôles autorisés à y naviguer. */
export const SPACE_PREFIXES: Record<string, Role[]> = {
  '/tuteur': [Role.Tutor],
  '/alternant': [Role.Alternant, Role.Stagiaire]
}

const DEFAULT_LANDING: Record<Role, string> = {
  Tutor: '/tuteur/dashboard',
  Alternant: '/alternant/dashboard',
  Stagiaire: '/alternant/dashboard'
}

function stripQuery(path: string): string {
  const i = path.search(/[?#]/)
  return i === -1 ? path : path.slice(0, i)
}

/**
 * Rôles autorisés sur un chemin, d'après son préfixe d'espace.
 * `null` si le chemin n'appartient à aucun espace (pages publiques/communes).
 */
export function rolesAllowedFor(path: string): Role[] | null {
  const clean = stripQuery(path)
  for (const [prefix, roles] of Object.entries(SPACE_PREFIXES)) {
    if (clean === prefix || clean.startsWith(`${prefix}/`)) return roles
  }
  return null
}

/** Préfixe d'espace d'un rôle (`/tuteur` ou `/alternant`). */
export function spacePrefixFor(role: Role): string {
  return role === Role.Tutor ? '/tuteur' : '/alternant'
}

/**
 * Préfixe d'espace d'un chemin, `null` hors espace. Utile aux composants
 * partagés entre les deux espaces pour construire des liens relatifs au
 * préfixe courant.
 */
export function spacePrefixOf(path: string): string | null {
  const clean = stripQuery(path)
  for (const prefix of Object.keys(SPACE_PREFIXES)) {
    if (clean === prefix || clean.startsWith(`${prefix}/`)) return prefix
  }
  return null
}

export function landingPageFor(role: Role): string {
  return DEFAULT_LANDING[role]
}

/**
 * Chemin après connexion : le `?redirect=` demandé s'il est sûr (relatif) ET
 * accessible au rôle — un redirect vers un espace interdit est ignoré au
 * profit du landing par rôle, pour éviter le rebond /login → page → /forbidden.
 */
export function resolvePostLoginPath(role: Role, requested?: string | null): string {
  if (requested && requested.startsWith('/') && !requested.startsWith('//')) {
    const allowed = rolesAllowedFor(requested)
    if (allowed === null || allowed.includes(role)) return requested
  }
  return landingPageFor(role)
}
