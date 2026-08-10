import { z } from 'zod'
import { LEARNER_ROLES } from '~/shared/utils/profiles'

/** Durée de validité d'une invitation, en jours. */
export const INVITATION_TTL_DAYS = 7

const email = z
  .string({ error: "L'adresse e-mail est requise." })
  .trim()
  .toLowerCase()
  .email('Adresse e-mail invalide.')

const optionalName = z.string().trim().max(120, '120 caractères maximum.').optional()

/**
 * Envoi d'une invitation par un tuteur. Le rôle est borné aux rôles apprenants :
 * une invitation ne doit jamais permettre de créer un compte `Tutor`.
 */
export const invitationCreateSchema = z.object({
  email,
  firstName: optionalName,
  lastName: optionalName,
  role: z.enum(LEARNER_ROLES).default('Stagiaire')
})

export type InvitationCreateInput = z.input<typeof invitationCreateSchema>

/** Invitation telle qu'exposée au visiteur du lien d'onboarding (données publiques). */
export interface PublicInvitation {
  email: string
  firstName: string | null
  lastName: string | null
  role: (typeof LEARNER_ROLES)[number]
  tutor: { firstName: string; lastName: string }
  expiresAt: string
}
