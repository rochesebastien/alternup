import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Note ID is required' })
  }

  const note = await prisma.courseNote.findUnique({
    where: { id },
    include: {
      assignment: {
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          course: { select: { id: true, title: true } }
        }
      }
    }
  })

  if (!note) {
    throw createError({ statusCode: 404, statusMessage: 'Note not found' })
  }

  return note
})
