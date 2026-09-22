import { randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import type { Prisma } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { INVITATION_TTL_DAYS } from '~/shared/utils/invitations'
import type { LearnerRole } from '~/shared/utils/profiles'

const DAY_MS = 24 * 60 * 60 * 1000

type Db = Prisma.TransactionClient | typeof prisma

/**
 * Émet (ou renouvelle) l'invitation d'un tuteur pour un email. Ré-inviter la
 * même personne remplace l'invitation précédente (nouveau token, nouvelle
 * expiration) au lieu d'empiler des liens actifs. Utilisé par
 * `POST /api/invitations` et par les actions de l'onboarding tuteur.
 */
export async function issueInvitation(
  db: Db,
  tutorId: string,
  input: { email: string; firstName?: string | null; lastName?: string | null; role: LearnerRole }
) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * DAY_MS)
  const data = {
    firstName: input.firstName || null,
    lastName: input.lastName || null,
    role: input.role,
    token,
    expiresAt
  }
  return db.invitation.upsert({
    where: { tutorId_email: { tutorId, email: input.email } },
    create: { tutorId, email: input.email, ...data },
    update: { ...data, acceptedAt: null }
  })
}

/** Lien d'onboarding à transmettre à l'invité (aucun email n'est envoyé). */
export function inviteUrlFor(event: H3Event, token: string): string {
  return `${getRequestURL(event).origin}/register?invite=${token}`
}
