import { randomBytes } from 'node:crypto'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { sendMail } from '~/server/utils/mail'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { invitationCreateSchema, INVITATION_TTL_DAYS } from '~/shared/utils/invitations'

const DAY_MS = 24 * 60 * 60 * 1000

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
        'Un compte existe déjà avec cet email. Utilisez « Attribution » pour le rattacher à votre réseau.'
    })
  }

  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * DAY_MS)

  // Ré-inviter la même personne remplace l'invitation précédente (nouveau
  // token, nouvelle expiration) au lieu d'empiler des liens actifs.
  const invitation = await prisma.invitation.upsert({
    where: { tutorId_email: { tutorId: tutor.id, email } },
    create: {
      tutorId: tutor.id,
      email,
      firstName: firstName || null,
      lastName: lastName || null,
      role,
      token,
      expiresAt
    },
    update: {
      firstName: firstName || null,
      lastName: lastName || null,
      role,
      token,
      expiresAt,
      acceptedAt: null
    }
  })

  const inviteUrl = `${getRequestURL(event).origin}/register?invite=${invitation.token}`
  const tutorName = `${tutor.firstName} ${tutor.lastName}`
  const roleLabel = role === 'Alternant' ? 'alternant' : 'stagiaire'

  const { sent } = await sendMail({
    to: email,
    subject: `${tutorName} vous invite à rejoindre Alternup`,
    text:
      `Bonjour,\n\n` +
      `${tutorName} vous invite à créer votre compte ${roleLabel} sur Alternup, ` +
      `l'application de suivi des alternants et stagiaires.\n\n` +
      `Créez votre compte en suivant ce lien (valable ${INVITATION_TTL_DAYS} jours) :\n` +
      `${inviteUrl}\n\n` +
      `À bientôt,\nL'équipe Alternup`,
    html:
      `<p>Bonjour,</p>` +
      `<p><strong>${tutorName}</strong> vous invite à créer votre compte ${roleLabel} sur ` +
      `<strong>Alternup</strong>, l'application de suivi des alternants et stagiaires.</p>` +
      `<p><a href="${inviteUrl}">Créer mon compte</a> (lien valable ${INVITATION_TTL_DAYS} jours)</p>` +
      `<p>À bientôt,<br>L'équipe Alternup</p>`
  })

  return { id: invitation.id, email: invitation.email, inviteUrl, emailSent: sent }
})
