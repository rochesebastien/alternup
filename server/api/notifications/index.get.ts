import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { computeReminders } from '~/server/utils/notifications'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import {
  NOTIFICATION_PAGE_SIZE,
  notificationListQuerySchema
} from '~/shared/utils/notifications'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const parsed = notificationListQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Paramètres de pagination invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const [notifications, reminders] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        link: true,
        readAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      skip: parsed.data.skip ?? 0,
      take: NOTIFICATION_PAGE_SIZE
    }),
    computeReminders(user)
  ])

  return { notifications, reminders }
})
