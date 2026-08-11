import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (user.role === Role.Tutor) {
    const announcements = await prisma.announcement.findMany({
      where: { authorId: user.id },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        recipients: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } }
          }
        }
      }
    })

    return announcements.map((a) => ({
      ...a,
      readCount: a.recipients.filter((r) => r.readAt).length,
      total: a.recipients.length
    }))
  }

  const recipients = await prisma.announcementRecipient.findMany({
    where: { studentId: user.id },
    orderBy: { announcement: { createdAt: 'desc' } },
    include: {
      announcement: {
        include: {
          author: { select: { firstName: true, lastName: true } }
        }
      }
    }
  })

  return recipients.map((r) => ({
    id: r.announcement.id,
    title: r.announcement.title,
    body: r.announcement.body,
    pinned: r.announcement.pinned,
    createdAt: r.announcement.createdAt,
    author: r.announcement.author,
    readAt: r.readAt
  }))
})
