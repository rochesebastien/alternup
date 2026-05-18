import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { loadProjectOwnedBy } from '~/server/utils/projects'

const uuid = z.string().uuid()

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = uuid.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid project id' })
  }

  await loadProjectOwnedBy(id.data, user)
  await prisma.project.delete({ where: { id: id.data } })
  return { message: 'Project deleted' }
})
