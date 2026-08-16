import { Prisma, Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireSelfTutor } from '~/server/utils/require-self-tutor'
import { addLearnerBodySchema } from '~/shared/utils/tutor-learners'
import { formatZodIssues } from '~/shared/utils/auth-credentials'

export default defineEventHandler(async (event) => {
  const tutor = await requireSelfTutor(event)

  const parsed = addLearnerBodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const where =
    'userId' in parsed.data ? { id: parsed.data.userId } : { email: parsed.data.email }

  const learner = await prisma.user.findUnique({
    where,
    select: { id: true, role: true, firstName: true, lastName: true, email: true }
  })
  if (!learner) {
    throw createError({ statusCode: 404, statusMessage: 'Utilisateur introuvable.' })
  }
  if (learner.role !== Role.Alternant && learner.role !== Role.Stagiaire) {
    throw createError({
      statusCode: 400,
      statusMessage: "Cet utilisateur n'est ni alternant ni stagiaire."
    })
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
      throw createError({
        statusCode: 409,
        statusMessage: 'Cette personne est déjà sous votre responsabilité.'
      })
    }
    throw err
  }
})
