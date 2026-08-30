// Redirections des anciennes routes vers les espaces /tuteur et /alternant
// (ADR-0001 §6). Module PUR : la table est consommée par le middleware global
// `legacy-redirect.global.ts` et testée dans `tests/shared/legacy-routes.test.ts`.

import { Role } from '~/shared/utils/enums'

/** Cible dépendante du rôle de session (routes ex-mixtes). */
export interface SpaceTargets {
  tuteur: string
  alternant: string
}

/** Cible fixe (chaîne, redirection 301) ou par rôle (302). */
export type LegacyTarget = string | SpaceTargets

/** Construit la double cible d'une route ex-mixte à partir de son chemin. */
function bothSpaces(path: string): SpaceTargets {
  return { tuteur: `/tuteur${path}`, alternant: `/alternant${path}` }
}

/** Correspondances exactes : ancien chemin → nouvelle cible. */
export const LEGACY_ROUTES: Record<string, LegacyTarget> = {
  '/dashboard': bothSpaces('/dashboard'),
  '/calendar': bothSpaces('/calendar'),
  '/presences': bothSpaces('/presences'),
  '/annonces': bothSpaces('/annonces'),
  '/messages': bothSpaces('/messages'),
  '/rapports': bothSpaces('/rapports'),
  '/bulletins': bothSpaces('/bulletins'),
  '/competences': bothSpaces('/competences'),
  '/visites': bothSpaces('/visites'),
  '/alternants': '/tuteur/alternants',
  '/projects': '/tuteur/projects',
  '/courses': '/alternant/courses',
  '/missions': '/alternant/missions'
}

/**
 * Correspondances par préfixe pour les routes dynamiques : le reste du chemin
 * est conservé (`/rapports/42` → `/tuteur/rapports/42`). Les préfixes les plus
 * longs sont listés en premier (`/bulletins/carte` avant `/bulletins`).
 */
export const LEGACY_PREFIXES: ReadonlyArray<{ prefix: string; target: LegacyTarget }> = [
  { prefix: '/bulletins/carte', target: bothSpaces('/bulletins/carte') },
  // `/bulletins/[id]` (gestion d'une période) est réservé au tuteur.
  { prefix: '/bulletins', target: '/tuteur/bulletins' },
  { prefix: '/rapports', target: bothSpaces('/rapports') },
  { prefix: '/messages', target: bothSpaces('/messages') },
  { prefix: '/alternants', target: '/tuteur/alternants' },
  { prefix: '/projects', target: '/tuteur/projects' }
]

/** Vrai si la cible dépend du rôle de session (redirection 302, jamais 301). */
export function isRoleDependent(target: LegacyTarget): target is SpaceTargets {
  return typeof target !== 'string'
}

function appendRest(target: LegacyTarget, rest: string): LegacyTarget {
  if (typeof target === 'string') return target + rest
  return { tuteur: target.tuteur + rest, alternant: target.alternant + rest }
}

/**
 * Cible d'un ancien chemin (sans query), `null` si le chemin n'est pas legacy.
 * Les routes dynamiques conservent le reste du chemin après le préfixe.
 */
export function resolveLegacyTarget(path: string): LegacyTarget | null {
  const exact = LEGACY_ROUTES[path]
  if (exact) return exact

  for (const { prefix, target } of LEGACY_PREFIXES) {
    if (path.startsWith(`${prefix}/`)) {
      return appendRest(target, path.slice(prefix.length))
    }
  }
  return null
}

/** Chemin final pour un rôle donné (les cibles fixes ignorent le rôle). */
export function legacyPathForRole(target: LegacyTarget, role: Role): string {
  if (typeof target === 'string') return target
  return role === Role.Tutor ? target.tuteur : target.alternant
}
