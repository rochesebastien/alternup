import { z } from 'zod'
import { Prisma, Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireSelfTutor } from '~/server/utils/require-self-tutor'

const bodySchema = z.object({
  userId: z.string().uuid()
})

export default defineEventHandler(async (event) => {
  const tutor = await requireSelfTutor(event)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const { userId } = parsed.data

  const learner = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, firstName: true, lastName: true, email: true }
  })
  if (!learner) {
    throw createError({ statusCode: 404, statusMessage: 'Learner not found' })
  }
  if (learner.role !== Role.Alternant && learner.role !== Role.Stagiaire) {
    throw createError({ statusCode: 400, statusMessage: 'Target user is not a learner' })
  }

  try {
    const relation = await prisma.tutorStudent.create({
      data: { tutorId: tutor.id, studentId: learner.id },
      include: {
        student: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true }
        }
      }
    })
    return { ...relation.student, addedAt: relation.addedAt }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Learner already linked to this tutor' })
    }
    throw err
  }
})
