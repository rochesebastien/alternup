import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'

const bodySchema = z
  .object({
    studentId: z.string().uuid(),
    tutorId: z.string().uuid(),
    title: z.string().min(1),
    startTime: z.coerce.date(),
    endTime: z.coerce.date()
  })
  .refine((d) => d.endTime > d.startTime, {
    message: 'endTime must be after startTime',
    path: ['endTime']
  })

export default defineEventHandler(async (event) => {
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  try {
    return await prisma.calendarEvent.create({
      data: parsed.data,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        tutor: { select: { id: true, firstName: true, lastName: true } }
      }
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      const field = (err.meta?.field_name as string | undefined) ?? ''
      const message = field.includes('tutor') ? 'Invalid tutorId' : 'Invalid studentId'
      throw createError({ statusCode: 400, statusMessage: message })
    }
    throw err
  }
})
