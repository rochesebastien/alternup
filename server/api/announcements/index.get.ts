import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import type { NetworkAnnouncement } from '~/shared/utils/announcements'

/**
 * Annonces qui concernent l'utilisateur connecté : celles qu'il a publiées et
 * celles qu'il a reçues, dans une seule liste. Les annonces circulant dans les
 * deux sens (tuteur ↔ apprenant), la réponse ne dépend plus du rôle.
 */
export default defineEventHandler(async (event): Promise<NetworkAnnouncement[]> => {
  const user = await requireAuth(event)

  const announcements = await prisma.announcement.findMany({
    where: {
      OR: [{ authorId: user.id }, { recipients: { some: { studentId: user.id } } }]
    },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
      recipients: {
        include: { student: { select: { id: true, firstName: true, lastName: true } } }
      }
    }
  })

  return announcements.map((a) => {
    const mine = a.authorId === user.id
    const own = a.recipients.find((r) => r.studentId === user.id)
    return {
      id: a.id,
      title: a.title,
      body: a.body,
      pinned: a.pinned,
      createdAt: a.createdAt.toISOString(),
      author: a.author,
      mine,
      readAt: own?.readAt?.toISOString() ?? null,
      recipients: a.recipients.map((r) => ({
        id: r.student.id,
        firstName: r.student.firstName,
        lastName: r.student.lastName,
        readAt: r.readAt?.toISOString() ?? null
      })),
      readCount: a.recipients.filter((r) => r.readAt).length,
      total: a.recipients.length
    }
  })
})
