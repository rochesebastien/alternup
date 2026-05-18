import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'

const bodySchema = z
  .object({
    studentId: z.string().uuid().optional(),
    tutorId: z.string().uuid().optional(),
    title: z.string().min(1).optional(),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional()
  })
  .refine((d) => !d.startTime || !d.endTime || d.endTime > d.startTime, {
    message: 'endTime must be after startTime',
    path: ['endTime']
  })

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Event ID is required' })
  }

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const data = parsed.data

  if ((data.startTime && !data.endTime) || (!data.startTime && data.endTime)) {
    const existing = await prisma.calendarEvent.findUnique({
      where: { id },
      select: { startTime: true, endTime: true }
    })
    if (!existing) {
      throw createError({ statusCode: 404, statusMessage: 'Event not found' })
    }
    const start = data.startTime ?? existing.startTime
    const end = data.endTime ?? existing.endTime
    if (end <= start) {
      throw createError({ statusCode: 400, statusMessage: 'endTime must be after startTime' })
    }
  }

  try {
    return await prisma.calendarEvent.update({
      where: { id },
      data,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        tutor: { select: { id: true, firstName: true, lastName: true } }
      }
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') throw createError({ statusCode: 404, statusMessage: 'Event not found' })
      if (err.code === 'P2003') {
        const field = (err.meta?.field_name as string | undefined) ?? ''
        const message = field.includes('tutor') ? 'Invalid tutorId' : 'Invalid studentId'
        throw createError({ statusCode: 400, statusMessage: message })
      }
    }
    throw err
  }
})
