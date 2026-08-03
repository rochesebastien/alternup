import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { computeReminders } from '~/server/utils/notifications'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const [unread, reminders] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    computeReminders(user)
  ])

  // `total` alimente le badge de la cloche : les relances en cours comptent
  // comme des éléments à traiter au même titre qu'une notification non lue.
  return { unread, reminders: reminders.length, total: unread + reminders.length }
})
