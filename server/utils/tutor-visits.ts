import { Role } from '@prisma/client'
import type { User } from '#auth-utils'
import { prisma } from '~/server/utils/prisma'

const visitInclude = {
  student: { select: { id: true, firstName: true, lastName: true, email: true } },
  tutor: { select: { id: true, firstName: true, lastName: true } }
} as const

/** Charge une visite visible par l'étudiant concerné ou le tuteur. 404 sinon. */
export async function loadVisitVisibleTo(id: string, user: User) {
  const visit = await prisma.tutorVisit.findUnique({ where: { id }, include: visitInclude })
  if (!visit || (visit.studentId !== user.id && visit.tutorId !== user.id)) {
    throw createError({ statusCode: 404, statusMessage: 'Visite introuvable' })
  }
  return visit
}

/** Charge une visite appartenant au tuteur connecté (édition). 404 sinon. */
export async function loadVisitOwnedBy(id: string, user: User) {
  const visit = await prisma.tutorVisit.findUnique({ where: { id } })
  if (!visit || user.role !== Role.Tutor || visit.tutorId !== user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Visite introuvable' })
  }
  return visit
}
