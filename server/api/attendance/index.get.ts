import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Tutor)

  const events = await prisma.calendarEvent.findMany({
    where: { tutorId: user.id },
    orderBy: { startTime: 'desc' },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      attendance: true,
      courseAssignment: {
        include: { course: { select: { title: true } } }
      }
    }
  })

  return events.map((ev) => ({
    id: ev.id,
    title: ev.courseAssignment?.course.title ?? ev.title,
    startTime: ev.startTime,
    endTime: ev.endTime,
    student: ev.student,
    attendance: ev.attendance
  }))
})
