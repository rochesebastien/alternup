import { Prisma, Role } from '@prisma/client'
import type { User } from '#auth-utils'
import { prisma } from '~/server/utils/prisma'

export function notionsToPrismaInput(
  value: string[] | null | undefined
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) return undefined
  if (value === null) return Prisma.DbNull
  return value
}

export async function assertTutorOwnsLearner(
  tutor: User,
  studentId: string
): Promise<void> {
  if (tutor.role !== Role.Tutor) {
    throw createError({ statusCode: 403, statusMessage: 'Accès refusé.' })
  }
  const relation = await prisma.tutorStudent.findUnique({
    where: { tutorId_studentId: { tutorId: tutor.id, studentId } }
  })
  if (!relation) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Cette personne ne fait pas partie de votre réseau.'
    })
  }
}

export async function loadCalendarEventVisibleTo(id: string, user: User) {
  const event = await prisma.calendarEvent.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, email: true } },
      tutor: { select: { id: true, firstName: true, lastName: true, email: true } },
      courseAssignment: {
        include: {
          course: { select: { id: true, title: true } }
        }
      }
    }
  })
  if (!event) {
    throw createError({ statusCode: 404, statusMessage: 'Événement introuvable.' })
  }
  const isOwner = event.tutorId === user.id || event.studentId === user.id
  if (!isOwner) {
    throw createError({ statusCode: 404, statusMessage: 'Événement introuvable.' })
  }
  return event
}

export async function loadCourseNoteVisibleTo(id: string, user: User) {
  const note = await prisma.courseNote.findUnique({
    where: { id },
    include: {
      assignment: {
        include: {
          student: { select: { id: true, firstName: true, lastName: true, email: true } },
          course: { select: { id: true, title: true } }
        }
      }
    }
  })
  if (!note) {
    throw createError({ statusCode: 404, statusMessage: 'Note introuvable.' })
  }
  await assertCanReadAssignment(user, note.assignment.studentId)
  return note
}

export async function assertCanReadAssignment(
  user: User,
  studentId: string
): Promise<void> {
  if (user.id === studentId) return
  if (user.role !== Role.Tutor) {
    throw createError({ statusCode: 404, statusMessage: 'Ressource introuvable.' })
  }
  const relation = await prisma.tutorStudent.findUnique({
    where: { tutorId_studentId: { tutorId: user.id, studentId } }
  })
  if (!relation) {
    throw createError({ statusCode: 404, statusMessage: 'Ressource introuvable.' })
  }
}

// --- Cours & affectations : ownership et visibilité ---------------------------

export const coursePersonSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true
} as const

/** 404 partout : l'existence d'un cours hors périmètre ne doit pas fuiter. */
function courseNotFound() {
  return createError({ statusCode: 404, statusMessage: 'Cours introuvable.' })
}

function assignmentNotFound() {
  return createError({ statusCode: 404, statusMessage: 'Affectation introuvable.' })
}

/** Le cours, si `user` en est le tuteur créateur. 404 sinon. */
export async function loadCourseOwnedBy(id: string, user: User) {
  if (user.role !== Role.Tutor) throw courseNotFound()
  const course = await prisma.course.findUnique({ where: { id } })
  if (!course || course.createdById !== user.id) throw courseNotFound()
  return course
}

/**
 * Le cours, si `user` l'a créé (tuteur) ou y est affecté (learner).
 * Côté learner, seules ses propres affectations sont renvoyées.
 */
export async function loadCourseVisibleTo(id: string, user: User) {
  const isTutor = user.role === Role.Tutor
  const course = await prisma.course.findFirst({
    where: isTutor
      ? { id, createdById: user.id }
      : { id, assignments: { some: { studentId: user.id } } },
    include: {
      createdBy: { select: coursePersonSelect },
      assignments: {
        where: isTutor ? undefined : { studentId: user.id },
        orderBy: { startDate: 'desc' },
        include: { student: { select: coursePersonSelect } }
      }
    }
  })
  if (!course) throw courseNotFound()
  return course
}

/**
 * L'affectation, si `user` est l'étudiant concerné, le créateur du cours,
 * ou le tuteur de l'étudiant. 404 sinon.
 */
export async function loadCourseAssignmentVisibleTo(id: string, user: User) {
  const assignment = await prisma.courseAssignment.findUnique({
    where: { id },
    include: {
      student: { select: coursePersonSelect },
      course: { include: { createdBy: { select: coursePersonSelect } } },
      notes: { orderBy: { sessionDate: 'desc' } }
    }
  })
  if (!assignment) throw assignmentNotFound()

  if (assignment.studentId === user.id) return assignment
  if (user.role !== Role.Tutor) throw assignmentNotFound()
  if (assignment.course.createdById === user.id) return assignment

  const relation = await prisma.tutorStudent.findUnique({
    where: { tutorId_studentId: { tutorId: user.id, studentId: assignment.studentId } }
  })
  if (!relation) throw assignmentNotFound()
  return assignment
}

/** L'affectation, si `user` est le tuteur créateur du cours associé. 404 sinon. */
export async function loadCourseAssignmentOwnedBy(id: string, user: User) {
  if (user.role !== Role.Tutor) throw assignmentNotFound()
  const assignment = await prisma.courseAssignment.findUnique({
    where: { id },
    include: { course: { select: { createdById: true } } }
  })
  if (!assignment || assignment.course.createdById !== user.id) throw assignmentNotFound()
  return assignment
}

/** Le learner doit appartenir au réseau du tuteur, sinon 404. */
export async function assertLearnerInNetwork(tutor: User, studentId: string) {
  const relation = await prisma.tutorStudent.findUnique({
    where: { tutorId_studentId: { tutorId: tutor.id, studentId } }
  })
  if (!relation) {
    throw createError({ statusCode: 404, statusMessage: 'Alternant introuvable.' })
  }
}
