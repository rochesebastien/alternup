import { z } from 'zod'
import { ProjectStatus } from '@prisma/client'

/**
 * Un « retour » (feedback) posté sur une mission. Append-only : chaque envoi crée
 * une nouvelle entrée dans le journal, on n'écrase jamais l'historique.
 */
export const projectUpdateCreateSchema = z.object({
  body: z.string().trim().min(1, 'Le retour ne peut pas être vide.').max(5000),
  // Statut optionnel : si fourni, met aussi à jour le statut courant de la mission.
  status: z.nativeEnum(ProjectStatus).optional()
})

export type ProjectUpdateCreateInput = z.infer<typeof projectUpdateCreateSchema>
