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

/** Invitation telle que listée pour le tuteur qui l'a émise (suivi d'acceptation). */
export interface TutorInvitation {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: (typeof LEARNER_ROLES)[number]
  inviteUrl: string
  createdAt: string
  expiresAt: string
  acceptedAt: string | null
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired'

/**
 * Statut d'une invitation : acceptée dès qu'elle a été consommée (même si sa
 * date d'expiration est passée depuis), expirée sinon au-delà de `expiresAt`.
 */
export function invitationStatus(
  invitation: { acceptedAt: string | Date | null; expiresAt: string | Date },
  now: Date = new Date()
): InvitationStatus {
  if (invitation.acceptedAt) return 'accepted'
  return new Date(invitation.expiresAt) < now ? 'expired' : 'pending'
}
