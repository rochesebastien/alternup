import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { loadCourseNoteVisibleTo } from '~/server/utils/courses'

const uuid = z.string().uuid()

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = uuid.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid note id' })
  }

  await loadCourseNoteVisibleTo(id.data, user)

  await prisma.courseNote.delete({ where: { id: id.data } })
  return { message: 'Note deleted' }
})
