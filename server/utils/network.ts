import { Role } from '@prisma/client'
import type { User } from '#auth-utils'
import { prisma } from '~/server/utils/prisma'

/** Vrai si `tutorId` a `studentId` dans son réseau (table TutorStudent). */
export async function isTutorOf(tutorId: string, studentId: string): Promise<boolean> {
  const link = await prisma.tutorStudent.findUnique({
    where: { tutorId_studentId: { tutorId, studentId } }
  })
  return link !== null
}

/** IDs des étudiants rattachés à ce tuteur. */
export async function learnerIdsOf(tutorId: string): Promise<string[]> {
  const links = await prisma.tutorStudent.findMany({
    where: { tutorId },
    select: { studentId: true }
  })
  return links.map((l) => l.studentId)
}

/** IDs des tuteurs auxquels cet apprenant est rattaché. */
export async function tutorIdsOf(studentId: string): Promise<string[]> {
  const links = await prisma.tutorStudent.findMany({
    where: { studentId },
    select: { tutorId: true }
  })
  return links.map((l) => l.tutorId)
}

/**
 * Personnes que cet utilisateur peut adresser : ses apprenants s'il est tuteur,
 * ses tuteurs s'il est alternant/stagiaire. La relation `TutorStudent` se lit
 * dans les deux sens — les annonces circulent donc dans les deux sens.
 */
export async function networkIdsOf(user: User): Promise<string[]> {
  return user.role === Role.Tutor ? learnerIdsOf(user.id) : tutorIdsOf(user.id)
}

/** 404 si l'utilisateur ne peut pas voir cet étudiant (ni lui-même, ni son tuteur). */
export async function assertCanViewStudent(studentId: string, user: User): Promise<void> {
  if (user.id === studentId) return
  if (user.role === Role.Tutor && (await isTutorOf(user.id, studentId))) return
  throw createError({ statusCode: 404, statusMessage: 'Ressource introuvable' })
}
