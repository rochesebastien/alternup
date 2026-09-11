import bcrypt from 'bcrypt'
import { prisma } from '~/server/utils/prisma'
import { toSessionUser } from '~/server/utils/session'
import { formatZodIssues, loginInputSchema } from '~/shared/utils/auth-credentials'

export default defineEventHandler(async (event) => {
  const parsed = loginInputSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données de connexion invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw createError({ statusCode: 401, statusMessage: 'Identifiants invalides.' })
  }

  const publicUser = toSessionUser(user)

  await setUserSession(event, { user: publicUser })
  return publicUser
})
