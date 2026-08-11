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

/** 404 si l'utilisateur ne peut pas voir cet étudiant (ni lui-même, ni son tuteur). */
export async function assertCanViewStudent(studentId: string, user: User): Promise<void> {
  if (user.id === studentId) return
  if (user.role === Role.Tutor && (await isTutorOf(user.id, studentId))) return
  throw createError({ statusCode: 404, statusMessage: 'Ressource introuvable' })
}
