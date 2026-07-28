import type { Role } from '@prisma/client'

const DEFAULT_LANDING: Record<Role, string> = {
  Tutor: '/dashboard',
  Alternant: '/dashboard',
  Stagiaire: '/dashboard'
}

export function landingPageFor(role: Role): string {
  return DEFAULT_LANDING[role]
}

export function resolvePostLoginPath(role: Role, requested?: string | null): string {
  if (requested && requested.startsWith('/') && !requested.startsWith('//')) {
    return requested
  }
  return landingPageFor(role)
}
