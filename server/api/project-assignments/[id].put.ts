import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { loadAssignmentVisibleTo } from '~/server/utils/projects'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { assignmentUpdateSchema, pickStudentEditableFields } from '~/shared/utils/projects'

const uuid = z.string().uuid()

const include = {
  project: { select: { id: true, title: true, internal: true } },
  student: { select: { id: true, firstName: true, lastName: true, email: true } }
} as const

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = uuid.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid assignment id' })
  }

  const assignment = await loadAssignmentVisibleTo(id.data, user)

  const parsed = assignmentUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid assignment payload',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const isTutor =
    user.role === Role.Tutor && assignment.project.createdById === user.id

  const data = isTutor ? parsed.data : pickStudentEditableFields(parsed.data)
  if (Object.keys(data).length === 0) {
    throw createError({ statusCode: 403, statusMessage: 'No editable field for this role' })
  }

  return prisma.projectAssignment.update({
    where: { id: id.data },
    data,
    include
  })
})
