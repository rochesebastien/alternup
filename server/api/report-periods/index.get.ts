import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Tutor)

  const periods = await prisma.reportPeriod.findMany({
    where: { tutorId: user.id },
    orderBy: { startDate: 'desc' },
    include: {
      _count: { select: { cards: true } },
      cards: { where: { publishedAt: { not: null } }, select: { id: true } }
    }
  })

  return periods.map((p) => ({
    id: p.id,
    label: p.label,
    startDate: p.startDate,
    endDate: p.endDate,
    closedAt: p.closedAt,
    cardsCount: p._count.cards,
    publishedCount: p.cards.length
  }))
})
