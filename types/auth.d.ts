import type { Role } from '@prisma/client'

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
