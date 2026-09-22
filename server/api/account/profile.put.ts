import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { sessionUserSelect, toSessionUser } from '~/server/utils/session'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { accountProfileUpdateSchema } from '~/shared/utils/account'

/**
 * Mise à jour de son identité (prénom / nom). La session est réécrite dans la
 * foulée : le nom affiché dans la barre de navigation vient du cookie de
 * session, il resterait sinon sur l'ancienne valeur jusqu'à la reconnexion.
 */
export default defineEventHandler(async (event) => {
  const current = await requireAuth(event)

  const parsed = accountProfileUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données de profil invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const updated = await prisma.user.update({
    where: { id: current.id },
    data: parsed.data,
    select: sessionUserSelect
  })

  const user = toSessionUser(updated)
  await setUserSession(event, { user })
  return user
})
