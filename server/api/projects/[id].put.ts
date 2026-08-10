import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { loadProjectOwnedBy } from '~/server/utils/projects'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { projectUpdateSchema } from '~/shared/utils/projects'

const uuid = z.string().uuid()

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = uuid.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant de projet invalide.' })
  }

  await loadProjectOwnedBy(id.data, user)

  const parsed = projectUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données de projet invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  return prisma.project.update({
    where: { id: id.data },
    data: parsed.data,
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true }
      }
    }
  })
})
