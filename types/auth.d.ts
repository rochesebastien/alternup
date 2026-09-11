import type { Role } from '~/shared/utils/enums'

declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    firstName: string
    lastName: string
    role: Role
    /** Questionnaire de première connexion terminé ou passé (voir /onboarding). */
    onboarded: boolean
  }

  interface UserSession {
    user: User
  }
}

export {}
