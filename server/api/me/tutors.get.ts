import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { getOrCreateConversation } from '~/server/utils/messages'

/** Tuteur rattaché à l'apprenant connecté, avec son fil de discussion. */
export interface MyTutor {
  id: string
  firstName: string
  lastName: string
  email: string
  /** Date de rattachement (ISO). */
  addedAt: string
  /** Fil de discussion tuteur↔apprenant (créé à la volée, comme /api/conversations). */
  conversationId: string
}

/**
 * Tuteurs de l'apprenant connecté (« Mon tuteur »). Réservé aux rôles
 * Alternant/Stagiaire : un tuteur consulte son réseau via /api/tutors/[id]/learners.
 * `TutorStudent` est N-N, on renvoie donc une liste (en pratique un seul tuteur).
 */
export default defineEventHandler(async (event): Promise<MyTutor[]> => {
  const user = await requireRole(event, Role.Alternant, Role.Stagiaire)

  const links = await prisma.tutorStudent.findMany({
    where: { studentId: user.id },
    orderBy: { addedAt: 'asc' },
    select: {
      addedAt: true,
      tutor: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  })

  return Promise.all(
    links.map(async (link) => {
      const conversation = await getOrCreateConversation(link.tutor.id, user.id)
      return {
        id: link.tutor.id,
        firstName: link.tutor.firstName,
        lastName: link.tutor.lastName,
        email: link.tutor.email,
        addedAt: link.addedAt.toISOString(),
        conversationId: conversation.id
      }
    })
  )
})
