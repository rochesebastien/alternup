import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { inviteUrlFor, issueInvitation } from '~/server/utils/invitations'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { invitationCreateSchema } from '~/shared/utils/invitations'

export default defineEventHandler(async (event) => {
  const tutor = await requireRole(event, Role.Tutor)

  const parsed = invitationCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Données d'invitation invalides.",
      data: { issues: formatZodIssues(parsed.error) }
    })
  }
  const { email, firstName, lastName, role } = parsed.data

  // Un compte existe déjà pour cet email : c'est un rattachement (bouton
  // « Attribution »), pas un onboarding.
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Un compte existe déjà avec cet email. Utilisez « Attribution » pour le placer sous votre responsabilité.'
    })
  }

  const invitation = await issueInvitation(prisma, tutor.id, { email, firstName, lastName, role })

  // Pas d'envoi d'email pour l'instant : le tuteur transmet lui-même le lien.
  const inviteUrl = inviteUrlFor(event, invitation.token)

  return {
    id: invitation.id,
    email: invitation.email,
    inviteUrl,
    expiresAt: invitation.expiresAt.toISOString()
  }
})
