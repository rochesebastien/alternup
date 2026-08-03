import { Role } from '@prisma/client'
import type { User } from '#auth-utils'
import { prisma } from '~/server/utils/prisma'
import { isTutorOf, learnerIdsOf } from '~/server/utils/network'

export const profileSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  createdAt: true,
  updatedAt: true
} as const

/** 404 systématique : on ne divulgue jamais l'existence d'un compte hors réseau. */
function profileNotFound() {
  return createError({ statusCode: 404, statusMessage: 'Profil introuvable.' })
}

/** Périmètre de lecture d'un tuteur : les étudiants de son réseau + lui-même. */
export async function visibleProfileIds(tutorId: string): Promise<string[]> {
  return [tutorId, ...(await learnerIdsOf(tutorId))]
}

/** Le profil demandé, si `user` est ce profil ou son tuteur. 404 sinon. */
export async function loadProfileVisibleTo(id: string, user: User) {
  const profile = await prisma.user.findUnique({
    where: { id },
    select: profileSelect
  })
  if (!profile) throw profileNotFound()
  if (profile.id === user.id) return profile
  if (user.role === Role.Tutor && (await isTutorOf(user.id, id))) return profile
  throw profileNotFound()
}

/** Le learner demandé, s'il appartient au réseau de `tutor`. 404 sinon. */
export async function loadNetworkLearner(tutor: User, studentId: string) {
  if (tutor.role !== Role.Tutor) throw profileNotFound()

  const learner = await prisma.user.findUnique({
    where: { id: studentId },
    select: profileSelect
  })
  if (!learner || learner.role === Role.Tutor) throw profileNotFound()
  if (!(await isTutorOf(tutor.id, studentId))) throw profileNotFound()

  return learner
}
