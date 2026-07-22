import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { loadVisitOwnedBy } from '~/server/utils/tutor-visits'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Tutor)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide' })
  }

  await loadVisitOwnedBy(idp.data, user)

  await prisma.tutorVisit.delete({ where: { id: idp.data } })

  return { ok: true }
})
