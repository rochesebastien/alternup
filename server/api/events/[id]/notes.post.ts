import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { loadCalendarEventVisibleTo, notionsToPrismaInput } from '~/server/utils/courses'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { eventNoteUpsertSchema } from '~/shared/utils/calendar'

const uuid = z.string().uuid()

const include = {
  assignment: {
    include: {
      student: { select: { id: true, firstName: true, lastName: true, email: true } },
      course: { select: { id: true, title: true } }
    }
  }
} as const

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = uuid.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid event id' })
  }

  const calEvent = await loadCalendarEventVisibleTo(id.data, user)
  if (!calEvent.courseAssignmentId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'This event is not linked to a course session'
    })
  }

  if (user.role !== Role.Tutor && user.id !== calEvent.studentId) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const parsed = eventNoteUpsertSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid note payload',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const sessionDate = new Date(calEvent.startTime)
  sessionDate.setUTCHours(0, 0, 0, 0)

  const grade = parsed.data.grade ?? null
  const comment = parsed.data.comment ?? null
  const notionsCovered = notionsToPrismaInput(parsed.data.notionsCovered ?? null)

  const existing = await prisma.courseNote.findFirst({
    where: { assignmentId: calEvent.courseAssignmentId, sessionDate }
  })

  if (existing) {
    return prisma.courseNote.update({
      where: { id: existing.id },
      data: { grade, comment, notionsCovered },
      include
    })
  }

  return prisma.courseNote.create({
    data: {
      assignmentId: calEvent.courseAssignmentId,
      sessionDate,
      grade,
      comment,
      notionsCovered
    },
    include
  })
})
