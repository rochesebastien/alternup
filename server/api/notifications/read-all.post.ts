import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const { count } = await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() }
  })

  return { updated: count }
})
