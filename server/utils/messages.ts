import { Role } from '@prisma/client'
import type { User } from '#auth-utils'
import { prisma } from '~/server/utils/prisma'
import { isTutorOf } from '~/server/utils/network'

const convInclude = {
  tutor: { select: { id: true, firstName: true, lastName: true } },
  student: { select: { id: true, firstName: true, lastName: true } }
} as const

/**
 * Récupère (ou crée) la conversation entre un tuteur et un étudiant de son réseau.
 * L'appelant doit être l'un des deux ; le lien tuteur↔étudiant est vérifié.
 */
export async function getOrCreateConversation(tutorId: string, studentId: string) {
  if (!(await isTutorOf(tutorId, studentId))) {
    throw createError({ statusCode: 404, statusMessage: 'Conversation indisponible' })
  }
  return prisma.conversation.upsert({
    where: { tutorId_studentId: { tutorId, studentId } },
    create: { tutorId, studentId },
    update: {},
    include: convInclude
  })
}

/** Charge une conversation visible par l'utilisateur (tuteur ou étudiant du fil). 404 sinon. */
export async function loadConversationVisibleTo(id: string, user: User) {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: convInclude
  })
  if (!conversation || (conversation.tutorId !== user.id && conversation.studentId !== user.id)) {
    throw createError({ statusCode: 404, statusMessage: 'Conversation introuvable' })
  }
  return conversation
}

/** L'interlocuteur (l'autre personne) du point de vue de `user`. */
export function otherParty(
  conversation: { tutorId: string; tutor: { firstName: string; lastName: string }; studentId: string; student: { firstName: string; lastName: string } },
  user: User
) {
  return user.role === Role.Tutor ? conversation.student : conversation.tutor
}
