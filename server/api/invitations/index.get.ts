import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import type { TutorInvitation } from '~/shared/utils/invitations'

/** Invitations émises par le tuteur connecté, pour le suivi d'acceptation. */
export default defineEventHandler(async (event): Promise<TutorInvitation[]> => {
  const tutor = await requireRole(event, Role.Tutor)

  const invitations = await prisma.invitation.findMany({
    where: { tutorId: tutor.id },
    orderBy: { createdAt: 'desc' }
  })

  const origin = getRequestURL(event).origin
  return invitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    firstName: inv.firstName,
    lastName: inv.lastName,
    role: inv.role as TutorInvitation['role'],
    inviteUrl: `${origin}/register?invite=${inv.token}`,
    createdAt: inv.createdAt.toISOString(),
    expiresAt: inv.expiresAt.toISOString(),
    acceptedAt: inv.acceptedAt?.toISOString() ?? null
  }))
})
