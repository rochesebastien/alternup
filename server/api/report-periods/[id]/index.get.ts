import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { loadPeriodOwnedBy } from '~/server/utils/report-cards'
import { learnerIdsOf } from '~/server/utils/network'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Tutor)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })
  }

  const period = await loadPeriodOwnedBy(idp.data, user)

  const [cards, ids] = await Promise.all([
    prisma.reportCard.findMany({
      where: { periodId: idp.data },
      include: { student: { select: { id: true, firstName: true, lastName: true } } }
    }),
    learnerIdsOf(user.id)
  ])

  const learners = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true }
  })

  return { period, cards, learners }
})
