import type { Role } from '~/shared/utils/enums'

declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    firstName: string
    lastName: string
    role: Role
  }

  interface UserSession {
    user: User
  }
}

export {}
