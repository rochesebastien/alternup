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
    throw createError({ statusCode: 400, statusMessage: 'Invalid event id' })
  }

  const existing = await loadCalendarEventVisibleTo(id.data, tutor)
  if (existing.tutorId !== tutor.id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
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
      throw createError({ statusCode: 400, statusMessage: 'endTime must be after startTime' })
    }
  }

  if (data.courseAssignmentId) {
    const assignment = await prisma.courseAssignment.findUnique({
      where: { id: data.courseAssignmentId },
      select: { studentId: true }
    })
    if (!assignment) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid courseAssignmentId' })
    }
    if (assignment.studentId !== existing.studentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Course assignment does not belong to this learner'
      })
    }
  }

  return prisma.calendarEvent.update({ where: { id: id.data }, data, include })
})
