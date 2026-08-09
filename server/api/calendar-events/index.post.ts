import { Prisma, Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { calendarEventCreateSchema } from '~/shared/utils/calendar'
import { assertTutorOwnsLearner } from '~/server/utils/courses'

const include = {
  student: { select: { id: true, firstName: true, lastName: true, email: true } },
  tutor: { select: { id: true, firstName: true, lastName: true, email: true } },
  courseAssignment: {
    include: { course: { select: { id: true, title: true } } }
  }
} as const

export default defineEventHandler(async (event) => {
  const tutor = await requireRole(event, Role.Tutor)

  const parsed = calendarEventCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données d\'événement invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  await assertTutorOwnsLearner(tutor, parsed.data.studentId)

  if (parsed.data.courseAssignmentId) {
    const assignment = await prisma.courseAssignment.findUnique({
      where: { id: parsed.data.courseAssignmentId },
      select: { studentId: true }
    })
    if (!assignment) {
      throw createError({ statusCode: 400, statusMessage: 'Affectation de cours introuvable.' })
    }
    if (assignment.studentId !== parsed.data.studentId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Cette affectation de cours n'appartient pas à cette personne."
      })
    }
  }

  try {
    return await prisma.calendarEvent.create({
      data: { ...parsed.data, tutorId: tutor.id },
      include
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      throw createError({ statusCode: 400, statusMessage: 'Référence liée introuvable.' })
    }
    throw err
  }
})
