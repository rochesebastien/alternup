import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { profileSelect, visibleProfileIds } from '~/server/utils/profiles'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { profileListQuerySchema } from '~/shared/utils/profiles'

export default defineEventHandler(async (event) => {
  const tutor = await requireRole(event, Role.Tutor)

  const parsed = profileListQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Filtre invalide.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  // Portée : le réseau du tuteur + lui-même — jamais toute la base.
  const ids = await visibleProfileIds(tutor.id)

  return prisma.user.findMany({
    where: {
      id: { in: ids },
      ...(parsed.data.role ? { role: parsed.data.role as Role } : {})
    },
    orderBy: { createdAt: 'desc' },
    select: profileSelect
  })
})
