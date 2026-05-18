import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'

const bodySchema = z.object({
  studentId: z.string().uuid(),
  courseId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  try {
    return await prisma.courseAssignment.create({
      data: parsed.data,
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true }
        },
        course: true
      }
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') throw createError({ statusCode: 409, statusMessage: 'Assignment already exists for this student, course and start date' })
      if (err.code === 'P2003') throw createError({ statusCode: 400, statusMessage: 'Invalid studentId or courseId reference' })
    }
    throw err
  }
})
