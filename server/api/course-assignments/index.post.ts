import { Prisma, Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import {
  assertLearnerInNetwork,
  coursePersonSelect,
  loadCourseOwnedBy
} from '~/server/utils/courses'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { courseAssignmentCreateSchema } from '~/shared/utils/courses'

export default defineEventHandler(async (event) => {
  const tutor = await requireRole(event, Role.Tutor)

  const parsed = courseAssignmentCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Données d'affectation invalides.",
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  // Le cours doit appartenir au tuteur et l'étudiant à son réseau (404 sinon).
  await loadCourseOwnedBy(parsed.data.courseId, tutor)
  await assertLearnerInNetwork(tutor, parsed.data.studentId)

  try {
    return await prisma.courseAssignment.create({
      data: parsed.data,
      include: {
        student: { select: coursePersonSelect },
        course: true
      }
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Cette affectation existe déjà pour cet étudiant, ce cours et cette date.'
      })
    }
    throw err
  }
})
