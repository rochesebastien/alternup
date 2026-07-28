import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { loadCompetencyOwnedBy } from '~/server/utils/competencies'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Tutor)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide' })
  }

  await loadCompetencyOwnedBy(idp.data, user)
  await prisma.competency.delete({ where: { id: idp.data } })

  return { ok: true }
})
