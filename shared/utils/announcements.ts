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

export interface AnnouncementRecipient {
  id: string
  firstName: string
  lastName: string
  readAt: string | null
}

/**
 * Annonce telle qu'exposée à un membre du réseau : la même forme qu'on en soit
 * l'auteur (`mine`) ou le destinataire (`readAt`).
 */
export interface NetworkAnnouncement {
  id: string
  title: string
  body: string
  pinned: boolean
  createdAt: string
  author: { id: string, firstName: string, lastName: string }
  /** Vrai si l'utilisateur courant est l'auteur de l'annonce. */
  mine: boolean
  /** Date de lecture par l'utilisateur courant (`null` s'il en est l'auteur). */
  readAt: string | null
  recipients: AnnouncementRecipient[]
  readCount: number
  total: number
}

/** Sépare les annonces reçues de celles que l'utilisateur a publiées. */
export function partitionAnnouncements<T extends { mine: boolean }>(
  announcements: T[]
): { received: T[], sent: T[] } {
  return {
    received: announcements.filter((a) => !a.mine),
    sent: announcements.filter((a) => a.mine)
  }
}

/** Annonces reçues et non encore lues par l'utilisateur courant. */
export function unreadAnnouncements<T extends { mine: boolean, readAt: string | null }>(
  announcements: T[]
): T[] {
  return announcements.filter((a) => !a.mine && !a.readAt)
}
