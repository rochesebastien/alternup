import { z } from 'zod'
import { Prisma, Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import {
  assertLearnerInNetwork,
  coursePersonSelect,
  loadCourseAssignmentOwnedBy,
  loadCourseOwnedBy
} from '~/server/utils/courses'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import {
  assignmentRangeIsValid,
  courseAssignmentUpdateSchema
} from '~/shared/utils/courses'

export default defineEventHandler(async (event) => {
  const tutor = await requireRole(event, Role.Tutor)

  const id = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: "Identifiant d'affectation invalide." })
  }

  const existing = await loadCourseAssignmentOwnedBy(id.data, tutor)

  const parsed = courseAssignmentUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Données d'affectation invalides.",
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  // Un déplacement vers un autre cours / étudiant reste borné au périmètre du tuteur.
  if (parsed.data.courseId) {
    await loadCourseOwnedBy(parsed.data.courseId, tutor)
  }
  if (parsed.data.studentId) {
    await assertLearnerInNetwork(tutor, parsed.data.studentId)
  }

  const startDate = parsed.data.startDate ?? existing.startDate
  const endDate =
    parsed.data.endDate === undefined ? existing.endDate : parsed.data.endDate
  if (!assignmentRangeIsValid(startDate, endDate)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La date de fin doit être postérieure à la date de début.'
    })
  }

  try {
    return await prisma.courseAssignment.update({
      where: { id: id.data },
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
