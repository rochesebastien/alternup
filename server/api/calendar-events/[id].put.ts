import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { loadCalendarEventVisibleTo } from '~/server/utils/courses'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { calendarEventUpdateSchema } from '~/shared/utils/calendar'

const uuid = z.string().uuid()

const include = {
  student: { select: { id: true, firstName: true, lastName: true, email: true } },
  tutor: { select: { id: true, firstName: true, lastName: true, email: true } },
  courseAssignment: {
    include: { course: { select: { id: true, title: true } } }
  }
} as const

export default defineEventHandler(async (event) => {
  const tutor = await requireRole(event, Role.Tutor)
  const id = uuid.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: "Identifiant d'événement invalide." })
  }

  const existing = await loadCalendarEventVisibleTo(id.data, tutor)
  if (existing.tutorId !== tutor.id) {
    throw createError({ statusCode: 403, statusMessage: 'Accès refusé.' })
  }

  const parsed = calendarEventUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données d\'événement invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }
  const data = parsed.data

  if (data.startTime || data.endTime) {
    const start = data.startTime ?? existing.startTime
    const end = data.endTime ?? existing.endTime
    if (end <= start) {
      throw createError({
        statusCode: 400,
        statusMessage: 'La date de fin doit être postérieure à la date de début.'
      })
    }
  }

  if (data.presenceRequired && !existing.studentId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La présence obligatoire nécessite un alternant.'
    })
  }

  if (data.courseAssignmentId) {
    const assignment = await prisma.courseAssignment.findUnique({
      where: { id: data.courseAssignmentId },
      select: { studentId: true }
    })
    if (!assignment) {
      throw createError({ statusCode: 400, statusMessage: 'Affectation de cours introuvable.' })
    }
    if (assignment.studentId !== existing.studentId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Cette affectation de cours n'appartient pas à cette personne."
      })
    }
  }

  return prisma.calendarEvent.update({ where: { id: id.data }, data, include })
})
