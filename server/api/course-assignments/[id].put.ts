import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'

const bodySchema = z.object({
  studentId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Assignment ID is required' })
  }

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  try {
    return await prisma.courseAssignment.update({
      where: { id },
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
      if (err.code === 'P2025') throw createError({ statusCode: 404, statusMessage: 'Assignment not found' })
      if (err.code === 'P2002') throw createError({ statusCode: 409, statusMessage: 'Assignment already exists for this student, course and start date' })
      if (err.code === 'P2003') throw createError({ statusCode: 400, statusMessage: 'Invalid studentId or courseId reference' })
    }
    throw err
  }
})
