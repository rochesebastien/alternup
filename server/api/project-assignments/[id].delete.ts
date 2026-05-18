import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { loadAssignmentVisibleTo } from '~/server/utils/projects'

const uuid = z.string().uuid()

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Tutor)
  const id = uuid.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid assignment id' })
  }

  const assignment = await loadAssignmentVisibleTo(id.data, user)
  if (assignment.project.createdById !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  await prisma.projectAssignment.delete({ where: { id: id.data } })
  return { message: 'Assignment deleted' }
})
