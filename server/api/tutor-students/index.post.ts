import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'

const bodySchema = z.object({
  tutorId: z.string().uuid(),
  studentId: z.string().uuid()
})

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true
} as const

export default defineEventHandler(async (event) => {
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  try {
    return await prisma.tutorStudent.create({
      data: parsed.data,
      include: {
        tutor: { select: userSelect },
        student: { select: userSelect }
      }
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        throw createError({ statusCode: 409, statusMessage: 'Relation already exists' })
      }
      if (err.code === 'P2003') {
        throw createError({ statusCode: 400, statusMessage: 'Invalid tutorId or studentId reference' })
      }
    }
    throw err
  }
})
