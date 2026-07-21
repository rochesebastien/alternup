import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { assertCanViewStudent } from '~/server/utils/network'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide' })
  }

  await assertCanViewStudent(idp.data, user)

  const events = await prisma.calendarEvent.findMany({
    where: { studentId: idp.data },
    orderBy: { startTime: 'desc' },
    include: {
      attendance: true,
      courseAssignment: {
        include: { course: { select: { title: true } } }
      }
    }
  })

  const items = events.map((ev) => ({
    eventId: ev.id,
    title: ev.courseAssignment?.course.title ?? ev.title,
    startTime: ev.startTime,
    status: ev.attendance?.status ?? null,
    minutesLate: ev.attendance?.minutesLate ?? null
  }))

  const recorded = events.filter((ev) => ev.attendance !== null)
  const total = recorded.length
  const present = recorded.filter((ev) => ev.attendance?.status === 'present').length
  const absent = recorded.filter((ev) => ev.attendance?.status === 'absent').length
  const retard = recorded.filter((ev) => ev.attendance?.status === 'retard').length
  const excuse = recorded.filter((ev) => ev.attendance?.status === 'excuse').length
  const rate = total > 0 ? Math.round(((present + retard) / total) * 100) : null

  return {
    items,
    summary: { total, present, absent, retard, excuse, rate }
  }
})
