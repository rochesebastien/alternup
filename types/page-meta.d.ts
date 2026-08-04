import type { Role } from '~/shared/utils/enums'

declare module '#app' {
  interface PageMeta {
    auth?: false
    requireRole?: Role | Role[]
  }
}

export {}
