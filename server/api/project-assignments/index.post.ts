import { z } from 'zod'
import { Prisma, ProjectStatus } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'

const bodySchema = z.object({
  projectId: z.string().uuid(),
  studentId: z.string().uuid(),
  status: z.nativeEnum(ProjectStatus).optional(),
  tutorComment: z.string().nullable().optional(),
  studentComment: z.string().nullable().optional(),
  startedAt: z.coerce.date().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  try {
    return await prisma.projectAssignment.create({
      data: parsed.data,
      include: {
        project: { select: { id: true, title: true, internal: true } },
        student: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') throw createError({ statusCode: 409, statusMessage: 'Assignment already exists' })
      if (err.code === 'P2003') {
        const field = (err.meta?.field_name as string | undefined) ?? ''
        const message = field.includes('project') ? 'Invalid projectId' : 'Invalid studentId'
        throw createError({ statusCode: 400, statusMessage: message })
      }
    }
    throw err
  }
})
