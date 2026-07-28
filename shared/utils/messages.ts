import { z } from 'zod'

export const messageCreateSchema = z.object({
  body: z.string().trim().min(1, 'Message vide').max(5000)
})

export type MessageCreateInput = z.infer<typeof messageCreateSchema>
