import { Role } from '@prisma/client'
import type { User } from '#auth-utils'
import { prisma } from '~/server/utils/prisma'

/**
 * Charge un événement dont l'utilisateur est le tuteur propriétaire (pour pointer
 * la présence). 404 si l'événement n'existe pas ou n'appartient pas à ce tuteur.
 */
export async function loadOwnedEvent(eventId: string, user: User) {
  const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } })
  if (!event || user.role !== Role.Tutor || event.tutorId !== user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Événement introuvable' })
  }
  return event
}
