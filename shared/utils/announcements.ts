import { z } from 'zod'

export const announcementCreateSchema = z.object({
  title: z.string().trim().min(1, 'Titre requis').max(200),
  body: z.string().trim().min(1, 'Contenu requis').max(10000),
  pinned: z.boolean().optional(),
  recipientIds: z
    .array(z.guid())
    .min(1, 'Sélectionnez au moins un destinataire.')
})

export type AnnouncementCreateInput = z.infer<typeof announcementCreateSchema>
