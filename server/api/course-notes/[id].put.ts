import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'

const bodySchema = z.object({
  assignmentId: z.string().uuid().optional(),
  sessionDate: z.coerce.date().optional(),
  grade: z.coerce.number().nullable().optional(),
  comment: z.string().nullable().optional(),
  notionsCovered: z.any().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Note ID is required' })
  }

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  try {
    return await prisma.courseNote.update({
      where: { id },
      data: parsed.data,
      include: {
        assignment: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
            course: { select: { id: true, title: true } }
          }
        }
      }
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') throw createError({ statusCode: 404, statusMessage: 'Note not found' })
      if (err.code === 'P2003') throw createError({ statusCode: 400, statusMessage: 'Invalid assignmentId' })
    }
    throw err
  }
})
