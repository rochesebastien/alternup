import type { User } from '#auth-utils'
import { prisma } from '~/server/utils/prisma'

const announcementInclude = {
  author: { select: { id: true, firstName: true, lastName: true } },
  recipients: {
    include: { student: { select: { id: true, firstName: true, lastName: true } } }
  }
} as const

/**
 * Charge une annonce visible par l'utilisateur : soit son auteur (tuteur), soit
 * un étudiant destinataire. 404 sinon.
 */
export async function loadAnnouncementVisibleTo(id: string, user: User) {
  const announcement = await prisma.announcement.findUnique({
    where: { id },
    include: announcementInclude
  })
  if (!announcement) {
    throw createError({ statusCode: 404, statusMessage: 'Annonce introuvable' })
  }
  const isAuthor = announcement.authorId === user.id
  const isRecipient = announcement.recipients.some((r) => r.studentId === user.id)
  if (!isAuthor && !isRecipient) {
    throw createError({ statusCode: 404, statusMessage: 'Annonce introuvable' })
  }
  return announcement
}
