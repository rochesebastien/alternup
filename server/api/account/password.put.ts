import bcrypt from 'bcrypt'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { accountPasswordUpdateSchema } from '~/shared/utils/account'

const PASSWORD_COST = 12

/** Changement de son propre mot de passe, mot de passe actuel à l'appui. */
export default defineEventHandler(async (event) => {
  const current = await requireAuth(event)

  const parsed = accountPasswordUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const account = await prisma.user.findUnique({
    where: { id: current.id },
    select: { passwordHash: true }
  })
  if (!account) {
    throw createError({ statusCode: 404, statusMessage: 'Compte introuvable.' })
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, account.passwordHash)
  if (!valid) {
    throw createError({ statusCode: 400, statusMessage: 'Mot de passe actuel incorrect.' })
  }

  await prisma.user.update({
    where: { id: current.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, PASSWORD_COST) }
  })

  return { ok: true }
})
