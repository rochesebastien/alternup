import type { Role } from '@prisma/client'

declare module '#app' {
  interface PageMeta {
    auth?: false
    requireRole?: Role | Role[]
  }
}

export {}
