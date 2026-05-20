import bcrypt from 'bcrypt'
import { Prisma } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
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

  const { password, ...data } = parsed.data
  const passwordHash = await bcrypt.hash(password, PASSWORD_COST)

  let user
  try {
    user = await prisma.user.create({
      data: { ...data, passwordHash },
      select: { id: true, email: true, firstName: true, lastName: true, role: true }
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Cette adresse e-mail est déjà utilisée.' })
    }
    throw err
  }

  await setUserSession(event, { user })
  return user
})
