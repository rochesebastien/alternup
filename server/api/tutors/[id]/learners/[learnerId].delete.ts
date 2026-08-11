import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireSelfTutor } from '~/server/utils/require-self-tutor'

const uuid = z.string().uuid()

export default defineEventHandler(async (event) => {
  const tutor = await requireSelfTutor(event)

  const learnerId = uuid.safeParse(getRouterParam(event, 'learnerId'))
  if (!learnerId.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })
  }

  try {
    await prisma.tutorStudent.delete({
      where: { tutorId_studentId: { tutorId: tutor.id, studentId: learnerId.data } }
    })
    return { message: 'Personne retirée de votre suivi.' }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw createError({
        statusCode: 404,
        statusMessage: "Cette personne n'est pas sous votre responsabilité."
      })
    }
    throw err
  }
})
