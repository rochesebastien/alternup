import type { User } from '#auth-utils'
import { onboardingStateOf } from '~/shared/utils/onboarding'

/**
 * Projection Prisma d'un utilisateur destiné au cookie de session, et sa
 * conversion. Point unique pour toutes les routes qui appellent
 * `setUserSession` (connexion, inscription, mise à jour du compte, onboarding) :
 * ajouter un champ à la session se fait ici, pas dans chaque route.
 */
export const sessionUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  onboardingCompletedAt: true,
  onboardingSkippedAt: true
} as const

type SessionUserRow = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: User['role']
  onboardingCompletedAt: Date | null
  onboardingSkippedAt: Date | null
}

export function toSessionUser(row: SessionUserRow): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role,
    onboarding: onboardingStateOf(row.onboardingCompletedAt, row.onboardingSkippedAt)
  }
}
