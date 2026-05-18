import { z } from 'zod'
import bcrypt from 'bcrypt'
import { Prisma, Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.nativeEnum(Role).default(Role.Alternant)
})

export default defineEventHandler(async (event) => {
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const { password, ...data } = parsed.data
  const passwordHash = await bcrypt.hash(password, 12)

  let user
  try {
    user = await prisma.user.create({
      data: { ...data, passwordHash },
      select: { id: true, email: true, firstName: true, lastName: true, role: true }
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Email already in use' })
    }
    throw err
  }

  await setUserSession(event, { user })
  return user
})
