import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Event ID is required' })
  }

  const calendarEvent = await prisma.calendarEvent.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      tutor: { select: { id: true, firstName: true, lastName: true } }
    }
  })

  if (!calendarEvent) {
    throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  }

  return calendarEvent
})
