import { z } from 'zod'

export const addLearnerBodySchema = z.union([
  z.object({ userId: z.string().uuid() }),
  z.object({ email: z.string().trim().toLowerCase().email() })
])

export type AddLearnerBody = z.input<typeof addLearnerBodySchema>
