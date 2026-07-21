import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { loadAssignmentVisibleTo } from '~/server/utils/projects'

const uuid = z.string().uuid()

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = uuid.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid assignment id' })
  }

  // 404 si l'utilisateur n'est ni le tuteur propriétaire ni l'étudiant de la mission.
  await loadAssignmentVisibleTo(id.data, user)

  return prisma.projectUpdate.findMany({
    where: { assignmentId: id.data },
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, role: true } }
    }
  })
})
