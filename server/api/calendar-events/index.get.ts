import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const studentId = typeof query.studentId === 'string' ? query.studentId : undefined
  const tutorId = typeof query.tutorId === 'string' ? query.tutorId : undefined

  return prisma.calendarEvent.findMany({
    where: {
      ...(studentId ? { studentId } : {}),
      ...(tutorId ? { tutorId } : {})
    },
    orderBy: { startTime: 'asc' },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      tutor: { select: { id: true, firstName: true, lastName: true } }
    }
  })
})
