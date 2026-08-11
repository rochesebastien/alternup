import bcrypt from 'bcrypt'
import { Prisma } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { notifyUser } from '~/server/utils/notifications'
import { formatZodIssues, registerInputSchema } from '~/shared/utils/auth-credentials'

const PASSWORD_COST = 12

export default defineEventHandler(async (event) => {
  const parsed = registerInputSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données d\'inscription invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const { password, inviteToken, ...data } = parsed.data
  const passwordHash = await bcrypt.hash(password, PASSWORD_COST)

  // Onboarding sur invitation : l'email et le rôle sont imposés par
  // l'invitation, et le compte est rattaché au réseau du tuteur invitant.
  let invitation = null
  if (inviteToken) {
    invitation = await prisma.invitation.findUnique({ where: { token: inviteToken } })
    if (!invitation || invitation.acceptedAt) {
      throw createError({ statusCode: 400, statusMessage: 'Invitation introuvable ou déjà utilisée.' })
    }
    if (invitation.expiresAt < new Date()) {
      throw createError({ statusCode: 400, statusMessage: 'Cette invitation a expiré.' })
    }
    data.email = invitation.email
    data.role = invitation.role
  }

  const select = { id: true, email: true, firstName: true, lastName: true, role: true } as const

  // `let` n'étant pas rétréci dans les callbacks, on fige la valeur non nulle.
  const inv = invitation

  let user
  try {
    user = inv
      ? await prisma.$transaction(async (tx) => {
          const created = await tx.user.create({ data: { ...data, passwordHash }, select })
          await tx.tutorStudent.create({
            data: { tutorId: inv.tutorId, studentId: created.id }
          })
          await tx.invitation.update({
            where: { id: inv.id },
            data: { acceptedAt: new Date() }
          })
          return created
        })
      : await prisma.user.create({ data: { ...data, passwordHash }, select })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Cette adresse e-mail est déjà utilisée.' })
    }
    throw err
  }

  // Suivi d'acceptation : le tuteur invitant est prévenu (best effort).
  if (inv) {
    await notifyUser(inv.tutorId, {
      type: 'invitation_acceptee',
      title: `${user.firstName} ${user.lastName} a accepté votre invitation`,
      body: `Le compte ${user.email} a été créé et placé sous votre responsabilité.`,
      link: '/alternants'
    })
  }

  await setUserSession(event, { user })
  return user
})
