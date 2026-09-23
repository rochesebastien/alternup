import type { Role } from '~/shared/utils/enums'
import type { OnboardingState } from '~/shared/utils/onboarding'

declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    firstName: string
    lastName: string
    role: Role
    /** Questionnaire de première connexion : à faire, passé, terminé (voir /onboarding). */
    onboarding: OnboardingState
  }

  interface UserSession {
    user: User
  }
}

export {}
