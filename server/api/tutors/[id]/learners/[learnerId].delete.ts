import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireSelfTutor } from '~/server/utils/require-self-tutor'

const uuid = z.string().uuid()

export default defineEventHandler(async (event) => {
  const tutor = await requireSelfTutor(event)

  const learnerId = uuid.safeParse(getRouterParam(event, 'learnerId'))
  if (!learnerId.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid learner id' })
  }

  try {
    await prisma.tutorStudent.delete({
      where: { tutorId_studentId: { tutorId: tutor.id, studentId: learnerId.data } }
    })
    return { message: 'Learner removed' }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw createError({ statusCode: 404, statusMessage: 'Relation not found' })
    }
    throw err
  }
})
