import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  return prisma.reportCard.findMany({
    where: { studentId: user.id, publishedAt: { not: null } },
    orderBy: { createdAt: 'desc' },
    include: {
      period: { select: { label: true, startDate: true, endDate: true } }
    }
  })
})
